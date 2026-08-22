import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface RouteMeta {
  title: string;
  description?: string;
}

const routeMetaMap: Record<string, RouteMeta> = {
  '/': {
    title: 'Pisairtel SMS — Multi-Tenant School Management System',
    description: 'All-in-one cloud school management platform featuring Computer-Based Testing (CBT), automated grading, real-time attendance, and tuition billing.',
  },
  '/login': {
    title: 'Login | Pisairtel SMS School Portal',
    description: 'Sign in to access your Pisairtel school management dashboard, staff portal, or student CBT center.',
  },
  '/apply': {
    title: 'Student Admission & Application | Pisairtel SMS',
    description: 'Submit an online application for student admission and enrollment at your school.',
  },
  '/inquiry': {
    title: 'Admission Inquiries | Pisairtel SMS',
    description: 'Submit general questions and admission inquiries to the school administration.',
  },
  '/parent/login': {
    title: 'Parent Portal Login | Pisairtel SMS',
    description: 'Parent and guardian access to student academic performance, attendance, and fee status.',
  },
  '/super-admin': {
    title: 'Super Admin Portal | Pisairtel SMS',
    description: 'Platform wide tenant governance, system telemetry, and licensing.',
  },
  '/unauthorized': {
    title: 'Access Restricted | Pisairtel SMS',
    description: 'You do not have permission to view this resource.',
  },
};

export function useDocumentMeta() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;

    let meta = routeMetaMap[path];

    if (!meta) {
      if (path.startsWith('/tenant')) {
        const sub = path.replace(/^\/tenant\/?/, '') || 'dashboard';
        const formatted = sub
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        meta = {
          title: `${formatted} | Pisairtel Admin Portal`,
          description: 'Pisairtel School Administrator Portal and Operations Management.',
        };
      } else if (path.startsWith('/student')) {
        meta = {
          title: 'Student Portal | Pisairtel SMS',
          description: 'Access exams, assignments, timetable, and academic results.',
        };
      } else if (path.startsWith('/staff')) {
        meta = {
          title: 'Staff Portal | Pisairtel SMS',
          description: 'Manage class attendance, score entry, lessons, and timetable.',
        };
      } else if (path.startsWith('/parent')) {
        meta = {
          title: 'Parent & Guardian Portal | Pisairtel SMS',
          description: 'View ward attendance, term performance, fee balances, and notices.',
        };
      } else {
        meta = {
          title: 'Pisairtel SMS — Multi-Tenant School Management System',
          description: 'Comprehensive school operations and academic management software.',
        };
      }
    }

    if (meta.title) {
      document.title = meta.title;
    }

    if (meta.description) {
      const descTag = document.querySelector('meta[name="description"]');
      if (descTag) {
        descTag.setAttribute('content', meta.description);
      }
      const ogDescTag = document.querySelector('meta[property="og:description"]');
      if (ogDescTag) {
        ogDescTag.setAttribute('content', meta.description);
      }
      const twitterDescTag = document.querySelector('meta[name="twitter:description"]');
      if (twitterDescTag) {
        twitterDescTag.setAttribute('content', meta.description);
      }
    }
  }, [location.pathname]);
}
