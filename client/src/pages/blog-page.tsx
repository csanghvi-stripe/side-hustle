import React, { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookMarked, Calendar, Clock, Search, Tag, User, Bookmark, ArrowRight } from "lucide-react";

// Blog post data - in a real app, this would come from an API
const blogPosts = [
  {
    id: 1,
    title: "How I Made My First $1,000 Online Without Prior Experience",
    excerpt: "Discover how I went from zero to $1,000 in just 45 days, leveraging simple skills everyone has but few think to monetize.",
    author: "Sarah Johnson",
    date: "April 4, 2025",
    readTime: "8 min read",
    category: "Success Stories",
    tags: ["first dollar", "beginner", "online income"],
    imageUrl: "https://images.unsplash.com/photo-1579621970588-a35d0e7ab9b6?auto=format&fit=crop&q=80&w=800&h=400",
    slug: "how-i-made-my-first-1000-online"
  },
  {
    id: 2,
    title: "The Freedom Economy: Why Side Hustles Are the New Job Security",
    excerpt: "Learn why building multiple income streams is no longer optional in today's economy and how it can lead to greater freedom and security.",
    author: "Marcus Chen",
    date: "March 28, 2025",
    readTime: "12 min read",
    category: "Financial Freedom",
    tags: ["multiple income", "job security", "economic freedom"],
    imageUrl: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&q=80&w=800&h=400",
    slug: "freedom-economy-side-hustles"
  },
  {
    id: 3,
    title: "5 Skills You Already Have That People Will Pay For",
    excerpt: "You'd be surprised at how many marketable skills you already possess. This article breaks down 5 common skills and how to monetize them.",
    author: "Priya Patel",
    date: "March 21, 2025",
    readTime: "6 min read",
    category: "Skill Monetization",
    tags: ["skills", "freelancing", "quick start"],
    imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800&h=400",
    slug: "5-skills-people-will-pay-for"
  },
  {
    id: 4,
    title: "From Idea to Income: Validating Your Side Hustle Before You Quit Your Day Job",
    excerpt: "The smart approach to testing and validating your business idea without risking your financial stability.",
    author: "James Wilson",
    date: "March 15, 2025",
    readTime: "10 min read",
    category: "Entrepreneurship",
    tags: ["validation", "ideas", "risk management"],
    imageUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800&h=400",
    slug: "idea-to-income-validation"
  },
  {
    id: 5,
    title: "The Psychology of Earning Your First Dollar Online",
    excerpt: "Why that first dollar matters so much psychologically, and how it can transform your mindset about money and value creation.",
    author: "Dr. Emily Rodriguez",
    date: "March 7, 2025",
    readTime: "9 min read",
    category: "Mindset",
    tags: ["psychology", "motivation", "first dollar"],
    imageUrl: "https://images.unsplash.com/photo-1579621970795-87facc2f976d?auto=format&fit=crop&q=80&w=800&h=400",
    slug: "psychology-of-first-dollar"
  },
  {
    id: 6,
    title: "Creating Digital Products That Sell While You Sleep",
    excerpt: "A comprehensive guide to building and selling digital products that generate passive income and scale without your constant involvement.",
    author: "Thomas Wright",
    date: "February 28, 2025",
    readTime: "14 min read",
    category: "Passive Income",
    tags: ["digital products", "passive income", "scaling"],
    imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800&h=400",
    slug: "digital-products-that-sell"
  }
];

// Categories for filtering
const categories = ["All", "Success Stories", "Financial Freedom", "Skill Monetization", "Entrepreneurship", "Mindset", "Passive Income"];

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  // Filter posts by search query and category
  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = searchQuery === "" || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === "All" || post.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto py-10 px-4">
      {/* Header section with title and featured post */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-3 gradient-heading">
          SideHustle Blog
        </h1>
        <p className="text-lg text-gray-600 mb-10 max-w-2xl">
          Insights, stories, and actionable advice to help you monetize your skills and achieve financial freedom.
        </p>
        
        {/* Featured post */}
        <div className="rounded-lg overflow-hidden bg-white shadow-lg border card-hover-effect">
          <div className="md:flex">
            <div className="md:w-1/2">
              <img 
                src={blogPosts[0].imageUrl} 
                alt={blogPosts[0].title} 
                className="w-full h-64 md:h-full object-cover"
              />
            </div>
            <div className="md:w-1/2 p-8 flex flex-col justify-between">
              <div>
                <Badge className="mb-2">{blogPosts[0].category}</Badge>
                <h2 className="text-2xl font-bold mb-4 hover:text-primary transition-colors">{blogPosts[0].title}</h2>
                <p className="text-gray-600 mb-6">{blogPosts[0].excerpt}</p>
              </div>
              
              <div>
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <User size={16} className="mr-1" />
                  <span className="mr-4">{blogPosts[0].author}</span>
                  <Calendar size={16} className="mr-1" />
                  <span className="mr-4">{blogPosts[0].date}</span>
                  <Clock size={16} className="mr-1" />
                  <span>{blogPosts[0].readTime}</span>
                </div>
                
                <Button asChild className="button-hover-effect">
                  <Link href={`/blog/${blogPosts[0].slug}`}>
                    Read Article <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Search and filter section */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Blog posts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {filteredPosts.slice(1).map(post => (
          <Card key={post.id} className="overflow-hidden h-full flex flex-col card-hover-effect">
            <div className="relative h-48">
              <img 
                src={post.imageUrl} 
                alt={post.title} 
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            
            <CardHeader className="flex-grow">
              <div className="flex justify-between items-center mb-2">
                <Badge>{post.category}</Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary">
                  <Bookmark className="h-4 w-4" />
                </Button>
              </div>
              <CardTitle className="text-xl mb-2 hover:text-primary transition-colors">{post.title}</CardTitle>
              <CardDescription className="text-sm text-gray-600">
                {post.excerpt}
              </CardDescription>
            </CardHeader>
            
            <CardFooter className="flex flex-col items-start pt-0">
              <div className="flex items-center text-xs text-gray-500 mb-4 w-full">
                <User size={14} className="mr-1" />
                <span className="mr-3">{post.author}</span>
                <Calendar size={14} className="mr-1" />
                <span className="mr-3">{post.date}</span>
                <Clock size={14} className="mr-1" />
                <span>{post.readTime}</span>
              </div>
              
              <Button variant="outline" size="sm" asChild className="mt-2 button-hover-effect">
                <Link href={`/blog/${post.slug}`}>
                  Read more <ArrowRight className="ml-2 h-3 w-3" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {/* Newsletter signup */}
      <div className="bg-gradient-to-r from-primary/10 to-indigo-500/10 p-8 rounded-lg shadow-md">
        <div className="max-w-2xl mx-auto text-center">
          <h3 className="text-2xl font-bold mb-2 gradient-heading">Get Monetization Tips In Your Inbox</h3>
          <p className="text-gray-600 mb-6">
            Join our newsletter for weekly insights on monetizing your skills and achieving financial freedom.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input placeholder="Your email address" className="flex-grow" />
            <Button className="button-hover-effect">Subscribe</Button>
          </div>
        </div>
      </div>
    </div>
  );
}