/**
 * HYEONIVERSE Agency Configuration
 * Redis Agency Style Clone
 */

import type { PortfolioConfig } from "./portfolio.config";

export const myConfig: PortfolioConfig = {
  // Agency Info
  personal: {
    name: "HYEONIVERSE",
    nickName: "HYEONIVERSE",
    role: "Creative Digital Agency",
    status: "Open for Projects",
    location: "Seoul, KR",
    eng: {
      name: "HYEONIVERSE",
      nickName: "HYEONIVERSE",
      role: "Creative Digital Agency",
    },
  },

  // Social Links
  social: {
    email: "hello@hyeoniverse.com",
    github: "https://github.com/hyeoniverse",
    blog: "https://blog.hyeoniverse.com",
    linkedin: "https://linkedin.com/company/hyeoniverse",
  },

  // Hero Section
  hero: {
    issueNumber: "Est. 2024",
    title: "HYEONIVERSE — Creative Digital Agency",
    description: "We create bold digital experiences that matter.",
    subDescription: "Branding / UX/UI / Webflow / Development / Motion",
    skills: [
      "Branding",
      "Marketing Design",
      "UX/UI",
      "Webflow",
      "Development",
      "Motion",
    ],
  },

  // About Section - Now Services
  about: {
    introduction: {
      title: "15 years of design experience, concentrated in its people",
      paragraphs: [
        {
          text: "We are a creative digital agency that combines strategy, design, and technology to create impactful digital experiences.",
          highlight: "HYEONIVERSE",
        },
      ],
    },
    tags: [
      { label: "Service", tag: "Branding", isFirst: true },
      { label: "Service", tag: "Marketing", isFirst: false },
      { label: "Service", tag: "UX/UI", isFirst: false },
      { label: "Service", tag: "Webflow", isFirst: false },
      { label: "Service", tag: "Development", isFirst: false },
      { label: "Service", tag: "Motion", isFirst: false },
    ],
    focusAreas: [
      {
        title: "Strategy & Branding",
        content:
          "We craft compelling brand identities and strategies that resonate with your audience and stand out in the market.",
      },
      {
        title: "Digital Design",
        content:
          "From user interfaces to marketing materials, we create visually stunning designs that drive engagement and conversions.",
      },
    ],
  },

  // Interview -> Team
  interview: {
    questions: [
      {
        number: "01",
        category: "Founder",
        title: "About HYEONIVERSE",
        paragraphs: [
          {
            text: "Founded with a vision to bridge the gap between creativity and technology.",
            isLead: true,
          },
          {
            text: "We believe great design should not only look beautiful but also solve real problems and create meaningful experiences.",
          },
          {
            text: "Our team combines diverse expertise in design, development, and strategy to deliver holistic digital solutions.",
            isHighlight: true,
          },
        ],
      },
      {
        number: "02",
        category: "Philosophy",
        title: "Our Approach",
        paragraphs: [
          {
            text: "We start every project by deeply understanding your business, users, and goals.",
            isLead: true,
          },
          {
            text: "This research-driven approach ensures that our creative solutions are not just visually appealing but strategically sound and user-centered.",
          },
        ],
      },
      {
        number: "03",
        category: "Process",
        title: "How We Work",
        paragraphs: [
          {
            text: "Collaboration is at the heart of everything we do.",
            isLead: true,
          },
          {
            text: "We work closely with our clients throughout the entire process, from initial concept to final delivery, ensuring transparency and alignment at every step.",
          },
        ],
      },
      {
        number: "04",
        category: "Vision",
        title: "Looking Forward",
        paragraphs: [
          {
            text: "We're constantly exploring new technologies and design trends to stay ahead of the curve.",
            isLead: true,
          },
          {
            text: "Our goal is to help brands navigate the ever-evolving digital landscape and create experiences that will stand the test of time.",
          },
          {
            text: "Let's create something extraordinary together.",
            isHighlight: true,
          },
        ],
      },
    ],
  },

  // Metadata
  metadata: {
    title: "HYEONIVERSE | Creative Digital Agency",
    description:
      "We are a creative digital agency specializing in Branding, UX/UI, Webflow, Development, and Motion design.",
    keywords:
      "creative agency, digital agency, branding, ux, ui, webflow, development, motion, design",
    author: "HYEONIVERSE",
    ogTitle: "HYEONIVERSE | Creative Digital Agency",
    ogDescription:
      "Creative digital agency specializing in branding, UX/UI, and web development",
  },

  // Portfolio Projects
  projects: [
    {
      id: "1",
      title: "Sakharov Space",
      description:
        "A complete brand identity and website design for an innovative space technology company.",
      period: { start: "2024-01", end: "2024-03" },
      teamSize: 4,
      images: [
        "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800",
        "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800",
      ],
      technologies: ["Branding", "Web Design", "Webflow", "Motion"],
      category: "team" as const,
      liveUrl: "https://example.com/sakharov",
    },
    {
      id: "2",
      title: "Fitil App",
      description:
        "Mobile app design for a fitness tracking platform with gamification elements.",
      period: { start: "2023-09", end: "2023-12" },
      teamSize: 3,
      images: [
        "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800",
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800",
      ],
      technologies: ["UX/UI", "Mobile Design", "Prototyping"],
      category: "team" as const,
      liveUrl: "https://example.com/fitil",
    },
    {
      id: "3",
      title: "Amway for Future",
      description:
        "Digital transformation project for a global brand, including e-commerce platform redesign.",
      period: { start: "2023-06", end: "2023-09" },
      teamSize: 6,
      images: [
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
      ],
      technologies: ["E-commerce", "UX Research", "Development"],
      category: "team" as const,
      liveUrl: "https://example.com/amway",
    },
    {
      id: "4",
      title: "Nova Finance",
      description:
        "Fintech dashboard design with real-time data visualization and intuitive user experience.",
      period: { start: "2024-02" },
      teamSize: 4,
      images: [
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800",
      ],
      technologies: ["Dashboard", "Data Viz", "React", "Development"],
      category: "team" as const,
      liveUrl: "https://example.com/nova",
    },
  ],

  // Project Details
  projectDetails: {
    "1": {
      period: "2024.01 - 2024.03",
      team: "Design 2, Development 2",
      role: "Full Service",
      features: [
        "Brand Strategy & Identity",
        "Website Design & Development",
        "Motion Graphics",
        "Marketing Collateral",
      ],
      challenges: [
        "Creating a futuristic yet approachable brand identity",
        "Balancing technical complexity with user-friendly design",
      ],
      learned: [
        "Space industry design trends",
        "Complex animation performance optimization",
      ],
    },
    "2": {
      period: "2023.09 - 2023.12",
      team: "UX 1, UI 2",
      role: "UX/UI Design",
      features: [
        "User Research & Persona Development",
        "Wireframing & Prototyping",
        "Visual Design System",
        "Gamification Elements",
      ],
      challenges: [
        "Designing engaging fitness experience",
        "Complex data visualization for progress tracking",
      ],
      learned: [
        "Health & fitness app best practices",
        "Gamification design patterns",
      ],
    },
    "3": {
      period: "2023.06 - 2023.09",
      team: "Strategy 1, Design 3, Dev 2",
      role: "Digital Transformation",
      features: [
        "E-commerce Platform Redesign",
        "User Journey Optimization",
        "Mobile-First Approach",
        "Performance Optimization",
      ],
      challenges: [
        "Large-scale platform migration",
        "Maintaining brand consistency across touchpoints",
      ],
      learned: [
        "Enterprise-level project management",
        "Global brand guidelines implementation",
      ],
    },
    "4": {
      period: "2024.02 - Present",
      team: "Design 2, Dev 2",
      role: "Product Design & Development",
      features: [
        "Real-time Dashboard",
        "Data Visualization",
        "User Permission System",
        "Report Generation",
      ],
      challenges: [
        "Complex data visualization requirements",
        "Real-time performance optimization",
      ],
      learned: [
        "Financial data visualization",
        "Real-time data handling patterns",
      ],
    },
  },

  // Services (formerly Skills)
  skills: [
    {
      domain: {
        id: "1",
        title: "Branding",
        subTitle: "Brand Strategy & Identity",
        description:
          "We create memorable brand identities that connect with audiences and drive business growth.",
      },
      skills: [
        {
          title: "Brand Strategy",
          icon: "01",
          level: "Expert",
          numericLevel: 95,
          description:
            "Comprehensive brand positioning, messaging, and go-to-market strategies.",
          keywords: ["Positioning", "Messaging", "Strategy"],
        },
        {
          title: "Visual Identity",
          icon: "02",
          level: "Expert",
          numericLevel: 95,
          description:
            "Logo design, color systems, typography, and comprehensive brand guidelines.",
          keywords: ["Logo", "Guidelines", "Visual System"],
        },
      ],
    },
    {
      domain: {
        id: "2",
        title: "UX/UI Design",
        subTitle: "Digital Product Design",
        description:
          "User-centered design that balances aesthetics with functionality.",
      },
      skills: [
        {
          title: "UX Research",
          icon: "01",
          level: "Expert",
          numericLevel: 90,
          description:
            "User interviews, surveys, usability testing, and data-driven insights.",
          keywords: ["Research", "Testing", "Analysis"],
        },
        {
          title: "UI Design",
          icon: "02",
          level: "Expert",
          numericLevel: 95,
          description:
            "Beautiful, intuitive interfaces that users love to interact with.",
          keywords: ["Interface", "Visual", "Interaction"],
        },
        {
          title: "Prototyping",
          icon: "03",
          level: "Expert",
          numericLevel: 90,
          description:
            "Interactive prototypes that bring ideas to life before development.",
          keywords: ["Figma", "Prototype", "Animation"],
        },
      ],
    },
    {
      domain: {
        id: "3",
        title: "Development",
        subTitle: "Web & App Development",
        description:
          "We build fast, scalable, and maintainable digital products.",
      },
      skills: [
        {
          title: "Webflow",
          icon: "01",
          level: "Expert",
          numericLevel: 95,
          description:
            "No-code websites with custom interactions and CMS integration.",
          keywords: ["No-code", "CMS", "Interactions"],
        },
        {
          title: "React/Next.js",
          icon: "02",
          level: "Expert",
          numericLevel: 90,
          description:
            "Modern web applications with excellent performance and SEO.",
          keywords: ["React", "Next.js", "TypeScript"],
        },
        {
          title: "Motion Design",
          icon: "03",
          level: "Experienced",
          numericLevel: 85,
          description:
            "Engaging animations and micro-interactions that delight users.",
          keywords: ["Animation", "GSAP", "Framer Motion"],
        },
      ],
    },
  ],

  // Team (formerly Experiences)
  experiences: [
    {
      id: "team-1",
      title: "Creative Director",
      organization: "Pavel Dergachev",
      startDate: "2024",
      endDate: null,
      description: [
        "Founder & Creative Director",
        "15+ years of design experience",
        "Previously led design at major tech companies",
        "Passionate about pushing creative boundaries",
      ],
      technologies: ["Leadership", "Strategy", "Design"],
      type: "achievement",
    },
    {
      id: "team-2",
      title: "Lead Designer",
      organization: "Design Team",
      startDate: "2024",
      endDate: null,
      description: [
        "Senior designers with diverse backgrounds",
        "Specializing in digital and brand design",
        "Award-winning portfolio",
      ],
      technologies: ["UI/UX", "Branding", "Motion"],
      type: "activity",
    },
    {
      id: "team-3",
      title: "Development Team",
      organization: "Tech Team",
      startDate: "2024",
      endDate: null,
      description: [
        "Full-stack developers",
        "Webflow certified experts",
        "Performance optimization specialists",
      ],
      technologies: ["React", "Next.js", "Webflow"],
      type: "activity",
    },
  ],

  // Blog Posts
  blogPosts: [
    {
      id: "1",
      title: "The Future of Digital Branding",
      excerpt:
        "How AI and new technologies are reshaping brand experiences in the digital age.",
      date: "2024.01.15",
      readTime: "8 min",
      category: "Branding",
      tags: ["Branding", "AI", "Trends"],
      url: "https://blog.hyeoniverse.com/digital-branding",
      featured: true,
    },
    {
      id: "2",
      title: "Design Systems That Scale",
      excerpt:
        "Building flexible design systems that grow with your product and team.",
      date: "2024.01.08",
      readTime: "12 min",
      category: "Design",
      tags: ["Design Systems", "UI", "Process"],
      url: "https://blog.hyeoniverse.com/design-systems",
      featured: true,
    },
    {
      id: "3",
      title: "Webflow vs Custom Development",
      excerpt:
        "When to choose no-code solutions and when custom development makes sense.",
      date: "2024.01.01",
      readTime: "6 min",
      category: "Development",
      tags: ["Webflow", "Development", "Strategy"],
      url: "https://blog.hyeoniverse.com/webflow-vs-custom",
    },
  ],
};
