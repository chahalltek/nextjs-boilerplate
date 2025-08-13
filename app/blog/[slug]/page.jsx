import HyvorComments from "@/components/HyvorComments";

// …inside your component’s return, after the post content…

{/* CTA that jumps to the comments */}
<div className="mt-10 flex justify-center">
  <a href="#hyvor-talk-view" className="cta-card inline-flex items-center gap-2">
    <span>Join the conversation</span>
    <span aria-hidden>→</span>
  </a>
</div>

{/* Comments */}
<section className="mt-8" aria-label="Comments">
  <HyvorComments pageId={`blog:${post.slug}`} title={post.title} />
</section>
