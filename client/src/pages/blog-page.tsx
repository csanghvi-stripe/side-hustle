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
      <div className="mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-heading">
          SideHustle Blog
        </h1>
        <p className="text-lg text-neutral-600 mb-10 max-w-2xl leading-relaxed">
          Insights, stories, and actionable advice to help you monetize your skills and achieve financial freedom.
        </p>
        
        {/* Featured post */}
        <div className="rounded-lg overflow-hidden card-hover-effect">
          <div className="md:flex">
            <div className="md:w-1/2 relative">
              <img 
                src={blogPosts[0].imageUrl} 
                alt={blogPosts[0].title} 
                className="w-full h-64 md:h-full object-cover"
              />
              <div className="absolute top-4 left-4">
                <span className="badge-enhanced primary">
                  {blogPosts[0].category}
                </span>
              </div>
            </div>
            <div className="md:w-1/2 p-8 flex flex-col justify-between bg-white">
              <div>
                <h2 className="text-2xl font-bold mb-4 text-neutral-900 hover:text-primary transition-colors">
                  {blogPosts[0].title}
                </h2>
                <p className="text-neutral-600 mb-6 leading-relaxed">
                  {blogPosts[0].excerpt}
                </p>
              </div>
              
              <div>
                <div className="flex items-center text-sm text-neutral-500 mb-4">
                  <User size={16} className="mr-1 text-neutral-400" />
                  <span className="mr-4 font-medium">{blogPosts[0].author}</span>
                  <Calendar size={16} className="mr-1 text-neutral-400" />
                  <span className="mr-4">{blogPosts[0].date}</span>
                  <Clock size={16} className="mr-1 text-neutral-400" />
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
      <div className="mb-12 flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-5 rounded-lg shadow-sm border border-neutral-200">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={18} />
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-neutral-300 focus:border-primary/50"
          />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={
                selectedCategory === category 
                  ? "bg-primary hover:bg-primary/90" 
                  : "text-neutral-700 border-neutral-300 hover:text-primary hover:border-primary/50"
              }
            >
              {category}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Blog posts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
        {filteredPosts.slice(1).map(post => (
          <Card key={post.id} className="overflow-hidden h-full flex flex-col card-hover-effect">
            <div className="relative h-48">
              <img 
                src={post.imageUrl} 
                alt={post.title} 
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3">
                <span className="badge-enhanced primary text-xs">
                  {post.category}
                </span>
              </div>
              <div className="absolute top-3 right-3">
                <Button variant="ghost" size="sm" className="h-7 w-7 bg-white/90 hover:bg-white rounded-full p-0 shadow-sm hover:text-primary">
                  <Bookmark className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            
            <CardHeader className="flex-grow pt-5 pb-2">
              <Link href={`/blog/${post.slug}`} className="group">
                <CardTitle className="text-lg mb-2 font-bold text-neutral-900 group-hover:text-primary transition-colors">
                  {post.title}
                </CardTitle>
              </Link>
              <CardDescription className="text-sm text-neutral-600 leading-relaxed">
                {post.excerpt}
              </CardDescription>
            </CardHeader>
            
            <CardFooter className="flex flex-col items-start pt-2 pb-5 border-t border-neutral-100">
              <div className="flex items-center text-xs text-neutral-500 mb-3 w-full">
                <User size={14} className="mr-1 text-neutral-400" />
                <span className="mr-3 font-medium">{post.author}</span>
                <div className="flex items-center ml-auto text-neutral-400">
                  <Calendar size={12} className="mr-1" />
                  <span className="mr-3">{post.date}</span>
                  <Clock size={12} className="mr-1" />
                  <span>{post.readTime}</span>
                </div>
              </div>
              
              <Button variant="ghost" size="sm" asChild className="mt-1 hover:text-primary hover:bg-neutral-50 p-0 h-auto">
                <Link href={`/blog/${post.slug}`} className="flex items-center">
                  <span>Read article</span> 
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {/* Newsletter signup */}
      <div className="relative bg-white rounded-xl shadow-md overflow-hidden border border-neutral-200">
        <div className="absolute inset-0 opacity-10 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent"></div>
        
        <div className="relative px-8 py-12 md:py-14">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-2xl md:text-3xl font-bold mb-3 gradient-heading">
              Get Monetization Tips In Your Inbox
            </h3>
            <p className="text-neutral-600 mb-8 max-w-xl mx-auto leading-relaxed">
              Join our newsletter for weekly insights on monetizing your skills, finding opportunities, 
              and achieving financial freedom through your side hustle.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input 
                placeholder="Your email address" 
                className="flex-grow bg-white border-neutral-300 focus:border-primary shadow-sm"
              />
              <Button className="button-hover-effect px-6">
                Subscribe
              </Button>
            </div>
            
            <p className="text-xs text-neutral-400 mt-4">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        </div>
        
        <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/70 to-primary/20"></div>
      </div>
    </div>
  );
}