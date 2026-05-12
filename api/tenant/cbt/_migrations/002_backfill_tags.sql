-- Backfill migration: Populate question_tags catalog from existing questions
-- This migration reads all existing tags from the questions_bank.tags JSON column
-- and creates proper entries in the question_tags and question_tag_links tables

DO $$
DECLARE
    question_record RECORD;
    tag_name TEXT;
    tag_slug TEXT;
    tag_id UUID;
    tag_count INTEGER := 0;
    link_count INTEGER := 0;
BEGIN
    -- Loop through all questions that have tags
    FOR question_record IN 
        SELECT id, tenant_id, tags, subject FROM questions_bank 
        WHERE deleted_at IS NULL 
        AND tags IS NOT NULL 
        AND jsonb_array_length(tags::jsonb) > 0
    LOOP
        -- For each tag in the JSON array
        FOR tag_name IN SELECT jsonb_array_elements_text(question_record.tags::jsonb)
        LOOP
            -- Normalize tag name
            tag_name := trim(regexp_replace(tag_name, '\s+', ' ', 'g'));
            
            -- Skip empty tags
            IF tag_name = '' THEN CONTINUE; END IF;
            
            -- Generate slug
            tag_slug := lower(regexp_replace(tag_name, '[^a-z0-9\s-]', '', 'g'));
            tag_slug := regexp_replace(tag_slug, '\s+', '-', 'g');
            tag_slug := regexp_replace(tag_slug, '-+', '-', 'g');
            tag_slug := substring(tag_slug, 1, 120);
            
            -- Check if tag already exists for this tenant
            SELECT id INTO tag_id 
            FROM question_tags 
            WHERE tenant_id = question_record.tenant_id 
            AND slug = tag_slug 
            AND deleted_at IS NULL;
            
            -- If tag doesn't exist, create it
            IF tag_id IS NULL THEN
                INSERT INTO question_tags (tenant_id, name, slug, subject, usage_count, created_at, updated_at)
                VALUES (
                    question_record.tenant_id,
                    tag_name,
                    tag_slug,
                    question_record.subject,
                    0,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                ON CONFLICT (tenant_id, slug) DO NOTHING
                RETURNING id INTO tag_id;
                
                -- Get the ID again in case of conflict (another process created it)
                IF tag_id IS NULL THEN
                    SELECT id INTO tag_id 
                    FROM question_tags 
                    WHERE tenant_id = question_record.tenant_id 
                    AND slug = tag_slug 
                    AND deleted_at IS NULL;
                END IF;
                
                tag_count := tag_count + 1;
            END IF;
            
            -- Create link between question and tag if it doesn't exist
            IF tag_id IS NOT NULL THEN
                INSERT INTO question_tag_links (tenant_id, question_id, tag_id)
                VALUES (
                    question_record.tenant_id,
                    question_record.id,
                    tag_id
                )
                ON CONFLICT (question_id, tag_id) DO NOTHING;
                
                IF FOUND THEN
                    link_count := link_count + 1;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
    
    -- Update usage counts for all tags based on actual links
    UPDATE question_tags t
    SET usage_count = (
        SELECT COUNT(*) 
        FROM question_tag_links l
        WHERE l.tag_id = t.id
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE deleted_at IS NULL;
    
    RAISE NOTICE 'Backfill complete: Created % tags and % links', tag_count, link_count;
END $$;
