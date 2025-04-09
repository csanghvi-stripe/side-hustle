import React from "react";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Calendar, Clock, User, Tag, Share, Bookmark, Twitter, Facebook, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Blog post data - in a real app, this would come from an API
const blogPosts = [
  {
    id: 1,
    title: "How I Made My First $1,000 Online Without Prior Experience",
    excerpt: "Discover how I went from zero to $1,000 in just 45 days, leveraging simple skills everyone has but few think to monetize.",
    author: "Sarah Johnson",
    authorTitle: "Digital Marketing Specialist",
    authorBio: "Sarah is a self-taught digital marketer who started her side hustle journey in 2023. She specializes in helping beginners monetize their existing skills.",
    date: "April 4, 2025",
    readTime: "8 min read",
    category: "Success Stories",
    tags: ["first dollar", "beginner", "online income"],
    imageUrl: "https://images.unsplash.com/photo-1579621970588-a35d0e7ab9b6?auto=format&fit=crop&q=80&w=1600&h=700",
    avatarUrl: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=100&h=100",
    slug: "how-i-made-my-first-1000-online",
    content: `
      <p class="lead">Last year, I was stuck in a job I didn't love, living paycheck to paycheck, and feeling like I had no way out. Fast forward 45 days, and I had made my first $1,000 online. Here's exactly how it happened.</p>
      
      <h2>The Mindset Shift That Started Everything</h2>
      <p>The journey began when I stopped thinking about "getting a better job" and instead asked myself: "What skills do I already have that someone might pay for?" This simple question changed everything.</p>
      <p>I'd been helping friends with their social media for years. It wasn't anything fancy—just creating better posts and suggesting content strategies—but I realized this knowledge had value.</p>
      
      <h2>Finding My First Client (When I Had No Portfolio)</h2>
      <p>Without samples or testimonials, I needed to get creative. Here's what worked:</p>
      <ul>
        <li>I joined Facebook groups where small business owners hang out</li>
        <li>I offered genuinely helpful advice whenever someone asked social media questions</li>
        <li>After a week of being helpful, I posted that I was offering quick social media audits for just $50</li>
      </ul>
      <p>Three people took me up on it that very day. The audits took about 90 minutes each, and I delivered PDF reports with screenshots and specific recommendations.</p>
      
      <figure>
        <img src="https://images.unsplash.com/photo-1611926653458-09294b3142bf?auto=format&fit=crop&q=80&w=800&h=500" alt="Social media analytics" class="rounded-md" />
        <figcaption>A simple social media audit can deliver enormous value to small businesses</figcaption>
      </figure>
      
      <h2>Turning One-Off Projects Into Recurring Revenue</h2>
      <p>The true breakthrough came when two of those audit clients asked, "Could you just do this for me every month?"</p>
      <p>I offered a $350/month package that included:</p>
      <ul>
        <li>Weekly content calendar</li>
        <li>4 custom graphics (made with Canva, which I already knew how to use)</li>
        <li>Caption writing and hashtag research</li>
        <li>Monthly performance report</li>
      </ul>
      <p>Both clients signed on immediately. Just like that, I had $700 in monthly recurring revenue.</p>
      
      <h2>Hitting $1,000: The Power of Referrals</h2>
      <p>I delivered exceptional work to those first clients. The results weren't revolutionary, but I was responsive, met deadlines, and genuinely cared about their success.</p>
      <p>By week 6, one client had referred me to a friend who signed up for the same monthly package. That pushed me over the $1,000 mark.</p>
      
      <blockquote>
        <p>"The first $1,000 is the hardest. After that, you have proof—to yourself and others—that your skills have real market value."</p>
      </blockquote>
      
      <h2>The Tools That Made It Possible</h2>
      <p>I didn't need fancy equipment or expensive software:</p>
      <ul>
        <li>Canva free version for graphics</li>
        <li>Google Docs for content calendars</li>
        <li>Gmail for professional communication</li>
        <li>Paypal for receiving payments</li>
      </ul>
      
      <h2>Lessons Learned Along The Way</h2>
      <p>If I could do it all over again, here's what I'd keep in mind:</p>
      <ol>
        <li><strong>Start smaller than you think.</strong> My $50 audit was the perfect entry point.</li>
        <li><strong>Deliver ahead of schedule.</strong> This single habit generated the most positive feedback.</li>
        <li><strong>Don't wait until you feel "ready."</strong> I still felt like an imposter when I got started.</li>
        <li><strong>Focus on solving a specific problem.</strong> The more specific, the easier to sell.</li>
        <li><strong>Converting to recurring revenue is essential.</strong> One-off projects are a hamster wheel.</li>
      </ol>
      
      <figure>
        <img src="https://images.unsplash.com/photo-1579621970795-87facc2f976d?auto=format&fit=crop&q=80&w=800&h=500" alt="Person looking at revenue growth" class="rounded-md" />
        <figcaption>Tracking my income growth became addictive</figcaption>
      </figure>
      
      <h2>What's Next In My Journey</h2>
      <p>That first $1,000 showed me what's possible. In the months since, I've:</p>
      <ul>
        <li>Increased my monthly package to $500 (for new clients)</li>
        <li>Started offering strategy sessions at $150/hour</li>
        <li>Created templates I can reuse to work more efficiently</li>
        <li>Reduced my day job hours to part-time</li>
      </ul>
      <p>I'm not an overnight millionaire, but I've created a second income stream that's growing steadily, and the confidence that came with it has been life-changing.</p>
      
      <h2>Your Turn: Getting Started</h2>
      <p>If you're where I was a year ago, here's my advice:</p>
      <ol>
        <li>List every skill you have, even ones that seem "too basic" to charge for</li>
        <li>Join online communities where your potential clients hang out</li>
        <li>Start by being helpful without expectation</li>
        <li>Create a very small, specific offer to test the waters</li>
        <li>Deliver extraordinary value at your starter price</li>
      </ol>
      <p>The journey to your first $1,000 might look different than mine, but the principles remain the same. The market has room for you. Your skills have value. And someone out there needs exactly what you can offer.</p>
    `
  },
  {
    id: 2,
    title: "The Freedom Economy: Why Side Hustles Are the New Job Security",
    excerpt: "Learn why building multiple income streams is no longer optional in today's economy and how it can lead to greater freedom and security.",
    author: "Marcus Chen",
    authorTitle: "Financial Independence Coach",
    authorBio: "Marcus left his corporate banking job in 2022 to pursue financial independence through multiple income streams. He now teaches others how to build sustainable side hustles.",
    date: "March 28, 2025",
    readTime: "12 min read",
    category: "Financial Freedom",
    tags: ["multiple income", "job security", "economic freedom"],
    imageUrl: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&q=80&w=1600&h=700",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&h=100",
    slug: "freedom-economy-side-hustles",
    content: `<p class="lead">The era of the 40-year career at a single company is dead. In its place, we're seeing the rise of what I call the "Freedom Economy" – a new paradigm where individuals build multiple income streams to create both security and freedom.</p>
    
    <h2>From Job Security to Income Security</h2>
    <p>Traditional job security has been eroding for decades. The latest wave of tech layoffs and economic uncertainty only confirms what many have suspected: relying on a single employer for your financial wellbeing is increasingly risky.</p>
    
    <p>The new paradigm is income security – ensuring you have money flowing in from various sources, so if one dries up, you're not left completely vulnerable.</p>
    
    <blockquote>
      <p>"The average millionaire has seven income streams. This isn't about getting rich – it's about creating stability in an unstable world."</p>
    </blockquote>
    
    <h2>Why This Matters Now More Than Ever</h2>
    <p>Several forces are converging to make multiple income streams not just desirable, but necessary:</p>
    
    <ul>
      <li>AI and automation are transforming the job landscape</li>
      <li>Global competition for traditional jobs is increasing</li>
      <li>Economic cycles are becoming more volatile and unpredictable</li>
      <li>The cost of essentials (housing, healthcare, education) continues to outpace wage growth</li>
      <li>Retirement funds require more self-direction than ever before</li>
    </ul>
    
    <figure>
      <img src="https://images.unsplash.com/photo-1579621970795-87facc2f976d?auto=format&fit=crop&q=80&w=800&h=500" alt="Person analyzing multiple income streams" class="rounded-md" />
      <figcaption>Creating income diversity is the new retirement plan</figcaption>
    </figure>
    
    <h2>The Four Types of Side Hustle Freedom</h2>
    <p>When I work with clients, I identify four distinct types of freedom that side hustles can provide:</p>
    
    <h3>1. Financial Freedom</h3>
    <p>The most obvious benefit – additional income that can help you pay down debt, build savings, or fund the lifestyle you desire. Even an extra $500-1,000 per month can significantly reduce financial stress for many households.</p>
    
    <h3>2. Time Freedom</h3>
    <p>Many side hustles can be structured to generate income on your schedule. This flexibility allows you to work when it suits you, rather than being locked into a rigid 9-5 structure.</p>
    
    <h3>3. Location Freedom</h3>
    <p>Digital side hustles in particular enable you to work from anywhere with an internet connection. This opens up possibilities for travel, relocating to a lower-cost area, or just working from your favorite café.</p>
    
    <h3>4. Psychological Freedom</h3>
    <p>Perhaps the most underrated benefit: knowing you have options reduces the fear and anxiety that comes with being dependent on a single employer. This confidence often translates into better performance and negotiating power in your primary career.</p>
    
    <h2>The Tax Advantages Nobody Talks About</h2>
    <p>Side hustles that qualify as businesses come with legitimate tax advantages that employed individuals can't access. While you should always consult with a tax professional, these can include:</p>
    
    <ul>
      <li>Home office deductions</li>
      <li>Business travel and meal deductions</li>
      <li>Vehicle expenses and mileage deductions</li>
      <li>Technology and equipment write-offs</li>
      <li>Retirement plans with higher contribution limits</li>
    </ul>
    
    <p>These benefits can significantly reduce your taxable income, especially in the early years of your side hustle.</p>
    
    <h2>Starting Small: The Minimum Viable Side Hustle</h2>
    <p>The biggest mistake I see people make is trying to build an empire overnight. Instead, I advocate for what I call the "Minimum Viable Side Hustle" – the smallest version of your idea that can start generating income.</p>
    
    <p>For example:</p>
    <ul>
      <li>Instead of creating a full course, offer one-on-one coaching</li>
      <li>Instead of building a complete app, offer the service manually to a few customers</li>
      <li>Instead of setting up an e-commerce store with dozens of products, sell one item on an existing marketplace</li>
    </ul>
    
    <p>This approach allows you to test demand with minimal investment, learn from real customers, and generate income while you refine your offering.</p>
    
    <h2>Real-World Examples of Freedom Economy Success</h2>
    <p>Let me share a few examples from my own clients:</p>
    
    <h3>Case Study 1: The Accountant Who Creates Excel Templates</h3>
    <p>Michael, a corporate accountant, now makes an additional $3,000/month selling specialized Excel templates to small businesses. His initial investment was just his time and expertise.</p>
    
    <h3>Case Study 2: The Teacher Who Tutors Online</h3>
    <p>Sophia, an elementary school teacher, earns $1,500/month tutoring students online for 5-6 hours per week. She uses her existing knowledge but reaches students worldwide.</p>
    
    <h3>Case Study 3: The Hobbyist Woodworker Who Sells Cutting Boards</h3>
    <p>James turned his weekend woodworking hobby into a $2,000/month side business selling premium cutting boards through Etsy and local markets.</p>
    
    <figure>
      <img src="https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?auto=format&fit=crop&q=80&w=800&h=500" alt="Person working on side hustle at home" class="rounded-md" />
      <figcaption>Many successful side hustles start at the kitchen table</figcaption>
    </figure>
    
    <h2>Common Objections and Reality Checks</h2>
    <p>Whenever I discuss this topic, certain objections inevitably arise:</p>
    
    <h3>"I don't have time for a side hustle"</h3>
    <p>Start with just 5 hours a week – less time than the average American spends watching TV in a single day. Begin where you are, not where you think you should be.</p>
    
    <h3>"I don't have any valuable skills"</h3>
    <p>This is rarely true. Often, we devalue our own knowledge because it seems obvious to us. The skills you take for granted may be exactly what others are willing to pay for.</p>
    
    <h3>"The market is too saturated"</h3>
    <p>While many markets have competition, your unique perspective, approach, or niche focus can still create opportunity. Perfect execution in a crowded market beats poor execution in an empty one.</p>
    
    <h2>The Path Forward: Your Next Steps</h2>
    <p>If you're convinced that building income security makes sense, here's how to get started:</p>
    
    <ol>
      <li>List your skills, interests, and experiences that might have value to others</li>
      <li>Identify which of these aligns with market demand (people already paying for solutions)</li>
      <li>Create your Minimum Viable Side Hustle – the smallest version you can test</li>
      <li>Set a specific goal for your first income milestone (often $500/month is a good starting point)</li>
      <li>Allocate 5-10 dedicated hours per week to building your side hustle</li>
    </ol>
    
    <p>Remember that income security isn't built overnight, but neither was your dependence on a single income source. Each step you take toward diversifying your income makes you more resilient to whatever economic changes lie ahead.</p>
    
    <p>The Freedom Economy is here. The only question is whether you'll be an active participant in it, or remain dependent on systems that no longer provide the security they once did.</p>`
  }
];

// More blog posts would be added here with their content

// Find a blog post by slug
const findPostBySlug = (slug: string) => {
  return blogPosts.find(post => post.slug === slug);
};

// Related posts - would normally be dynamically generated
const relatedPosts = [
  {
    id: 3,
    title: "5 Skills You Already Have That People Will Pay For",
    excerpt: "You'd be surprised at how many marketable skills you already possess. This article breaks down 5 common skills and how to monetize them.",
    author: "Priya Patel",
    date: "March 21, 2025",
    readTime: "6 min read",
    category: "Skill Monetization",
    imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=400&h=250",
    slug: "5-skills-people-will-pay-for"
  },
  {
    id: 5,
    title: "The Psychology of Earning Your First Dollar Online",
    excerpt: "Why that first dollar matters so much psychologically, and how it can transform your mindset about money and value creation.",
    author: "Dr. Emily Rodriguez",
    date: "March 7, 2025",
    readTime: "9 min read",
    category: "Mindset",
    imageUrl: "https://images.unsplash.com/photo-1579621970795-87facc2f976d?auto=format&fit=crop&q=80&w=400&h=250",
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
    imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=400&h=250",
    slug: "digital-products-that-sell"
  }
];

export default function BlogPostPage() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug;
  const post = slug ? findPostBySlug(slug) : null;
  
  if (!post) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Blog Post Not Found</h1>
        <p className="text-gray-600 mb-6">Sorry, the blog post you're looking for doesn't exist.</p>
        <Button asChild>
          <Link href="/blog">Back to Blog</Link>
        </Button>
      </div>
    );
  }
  
  return (
    <div className="bg-white">
      {/* Hero section with image */}
      <div className="w-full h-[50vh] max-h-[500px] relative mb-10">
        <img 
          src={post.imageUrl} 
          alt={post.title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
          <div className="container px-4 py-10 text-center text-white">
            <Button variant="outline" className="text-white border-white mb-6" asChild>
              <Link href="/blog">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Blog
              </Link>
            </Button>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 max-w-4xl mx-auto">
              {post.title}
            </h1>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 pb-16">
        <div className="flex flex-col md:flex-row gap-12">
          {/* Main content */}
          <div className="md:w-2/3">
            {/* Article metadata */}
            <div className="flex flex-wrap items-center text-sm text-gray-500 mb-8">
              <Badge className="mr-4">{post.category}</Badge>
              <div className="flex items-center mr-4">
                <Calendar size={16} className="mr-1" />
                <span>{post.date}</span>
              </div>
              <div className="flex items-center">
                <Clock size={16} className="mr-1" />
                <span>{post.readTime}</span>
              </div>
            </div>
            
            {/* Article content */}
            <div 
              className="prose prose-lg max-w-none mb-12"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
            
            {/* Tags */}
            <div className="mb-8">
              <div className="flex items-center flex-wrap gap-2">
                <Tag size={16} className="text-gray-500" />
                {post.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Share buttons */}
            <div className="mb-12">
              <p className="text-sm font-medium text-gray-500 mb-2">Share this article:</p>
              <div className="flex space-x-2">
                <Button variant="outline" size="icon" className="rounded-full">
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full">
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full">
                  <Linkedin className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full">
                  <Share className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Author bio */}
            <div className="bg-gray-50 p-6 rounded-lg mb-10">
              <div className="flex items-center mb-4">
                <Avatar className="h-12 w-12 mr-4">
                  <AvatarImage src={post.avatarUrl} alt={post.author} />
                  <AvatarFallback>{post.author.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold">{post.author}</h3>
                  <p className="text-sm text-gray-500">{post.authorTitle}</p>
                </div>
              </div>
              <p className="text-gray-600">{post.authorBio}</p>
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="md:w-1/3">
            {/* Save for later */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Bookmark className="mr-2 h-5 w-5" />
                  Save for later
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Bookmark this article to read it later or reference back to it.
                </p>
                <Button className="w-full">Save Article</Button>
              </CardContent>
            </Card>
            
            {/* Related articles */}
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4">Related Articles</h3>
              <div className="space-y-4">
                {relatedPosts.map(relatedPost => (
                  <Link href={`/blog/${relatedPost.slug}`} key={relatedPost.id}>
                    <div className="flex gap-3 group">
                      <img 
                        src={relatedPost.imageUrl} 
                        alt={relatedPost.title} 
                        className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                      />
                      <div>
                        <h4 className="font-medium group-hover:text-primary transition-colors">{relatedPost.title}</h4>
                        <div className="flex text-xs text-gray-500 mt-1">
                          <Clock size={12} className="mr-1" />
                          <span>{relatedPost.readTime}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            
            {/* Newsletter signup */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">SideHustle Newsletter</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Get weekly updates on side hustle opportunities, success stories and practical tips.
                </p>
                <input 
                  type="email" 
                  placeholder="Your email" 
                  className="w-full p-2 border rounded-md mb-2"
                />
                <Button className="w-full">Subscribe</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}