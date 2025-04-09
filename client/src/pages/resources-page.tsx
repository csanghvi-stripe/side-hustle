import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, BookOpen, FileText, Video, Award, BarChart3, Lightbulb } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ResourceCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  category: string;
}

const ResourceCard = ({ title, description, icon, link, category }: ResourceCardProps) => (
  <Card className="h-full flex flex-col">
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {icon}
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-muted-foreground">
          {category}
        </span>
      </div>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardFooter className="mt-auto pt-6">
      <Button variant="outline" className="w-full" asChild>
        <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          Visit Resource
        </a>
      </Button>
    </CardFooter>
  </Card>
);

// Sample resource data - in a real app, this would come from an API/database
const resources = [
  // Guides
  {
    id: 1,
    title: "Beginner's Guide to Freelancing",
    description: "A comprehensive guide for anyone starting their freelancing journey. Learn how to find clients, set rates, and manage your workload.",
    category: "Guide",
    icon: <BookOpen className="h-5 w-5 text-primary" />,
    link: "https://www.freecodecamp.org/news/how-to-get-started-with-freelancing/",
    type: "freelancing"
  },
  {
    id: 2,
    title: "Digital Product Creation Blueprint",
    description: "Step-by-step instructions for creating and launching your first digital product. Includes templates and case studies.",
    category: "Blueprint",
    icon: <FileText className="h-5 w-5 text-primary" />,
    link: "https://www.shopify.com/blog/digital-products",
    type: "digital-products"
  },
  {
    id: 3,
    title: "Content Creation Masterclass",
    description: "Learn how to create engaging content for multiple platforms and build a loyal audience that generates income.",
    category: "Course",
    icon: <Video className="h-5 w-5 text-primary" />,
    link: "https://www.youtube.com/results?search_query=content+creation+masterclass",
    type: "content-creation"
  },
  
  // Case Studies
  {
    id: 4,
    title: "From Employee to $10K/Month Freelancer",
    description: "A detailed case study of how Sarah transitioned from a 9-5 job to earning $10,000 monthly as a freelance designer.",
    category: "Case Study",
    icon: <Award className="h-5 w-5 text-primary" />,
    link: "https://medium.com/swlh/how-i-made-10k-in-a-month-as-a-freelancer-50c36f21dec0",
    type: "freelancing"
  },
  {
    id: 5,
    title: "Building a $5K/Month Passive Income Stream",
    description: "How John created a suite of digital products that now generate $5,000 in monthly passive income.",
    category: "Case Study",
    icon: <BarChart3 className="h-5 w-5 text-primary" />,
    link: "https://www.indiehackers.com/post/0-5k-mrr-in-6-months-how-i-did-it-and-why-you-can-do-it-too-d8c3a8efc7",
    type: "digital-products"
  },
  {
    id: 6,
    title: "YouTube to Full-Time Income: Creator Success Story",
    description: "How Mia built a YouTube channel from 0 to 100K subscribers and turned it into her full-time income source.",
    category: "Success Story",
    icon: <Award className="h-5 w-5 text-primary" />,
    link: "https://www.youtube.com/watch?v=5Y3KgKa9wfw",
    type: "content-creation"
  },
  
  // Tools and Resources
  {
    id: 7,
    title: "Essential Tools for Freelancers",
    description: "A curated list of the best tools for managing clients, projects, invoicing, and growing your freelance business.",
    category: "Tools",
    icon: <Lightbulb className="h-5 w-5 text-primary" />,
    link: "https://blog.hubspot.com/marketing/freelancer-tools",
    type: "freelancing"
  },
  {
    id: 8,
    title: "Digital Product Marketplace Comparison",
    description: "Compare the top platforms for selling digital products, including fees, features, and audience reach.",
    category: "Comparison",
    icon: <BarChart3 className="h-5 w-5 text-primary" />,
    link: "https://www.wpbeginner.com/showcase/best-digital-download-marketplaces-for-creators/",
    type: "digital-products"
  },
  {
    id: 9,
    title: "Content Creator's Toolkit",
    description: "All the tools, software, and resources you need to create professional-quality content for any platform.",
    category: "Tools",
    icon: <Lightbulb className="h-5 w-5 text-primary" />,
    link: "https://blog.hootsuite.com/content-creation-tools/",
    type: "content-creation"
  }
];

const ResourcesPage = () => {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Resources & Learning</h1>
          <p className="text-muted-foreground">
            Discover helpful guides, case studies, and tools to accelerate your side hustle success
          </p>
        </div>
        
        <Tabs defaultValue="all" className="mb-8">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Resources</TabsTrigger>
            <TabsTrigger value="freelancing">Freelancing</TabsTrigger>
            <TabsTrigger value="digital-products">Digital Products</TabsTrigger>
            <TabsTrigger value="content-creation">Content Creation</TabsTrigger>
          </TabsList>
        
          <TabsContent value="all">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {resources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  title={resource.title}
                  description={resource.description}
                  icon={resource.icon}
                  link={resource.link}
                  category={resource.category}
                />
              ))}
            </div>
          </TabsContent>
        
          <TabsContent value="freelancing">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {resources
                .filter((resource) => resource.type === "freelancing")
                .map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    title={resource.title}
                    description={resource.description}
                    icon={resource.icon}
                    link={resource.link}
                    category={resource.category}
                  />
                ))}
            </div>
          </TabsContent>
        
          <TabsContent value="digital-products">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {resources
                .filter((resource) => resource.type === "digital-products")
                .map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    title={resource.title}
                    description={resource.description}
                    icon={resource.icon}
                    link={resource.link}
                    category={resource.category}
                  />
                ))}
            </div>
          </TabsContent>
        
          <TabsContent value="content-creation">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {resources
                .filter((resource) => resource.type === "content-creation")
                .map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    title={resource.title}
                    description={resource.description}
                    icon={resource.icon}
                    link={resource.link}
                    category={resource.category}
                  />
                ))}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-12 bg-muted/50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Submit a Resource</h2>
          <p className="text-muted-foreground mb-4">
            Know a great resource that should be included here? Let us know and we'll add it to our collection.
          </p>
          <Button>Suggest a Resource</Button>
        </div>
      </div>
    </div>
  );
};

export default ResourcesPage;