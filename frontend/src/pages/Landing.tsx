import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Zap, ArrowRight } from "lucide-react";
import Footer from "@/components/landing/footer";
import Hero from "@/components/landing/hero";
import Faqs from "@/components/landing/faqs";
import Problem from "@/components/landing/problem";
import Features from "@/components/landing/features";
import { steps } from "@/components/landing/content";
import Nav from "@/components/ui/nav";

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};


export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <Nav />

      {/* Hero */}
      <Hero />

      {/* Problem */}
      <Problem />

      {/* How It Works */}
      <section className="py-20 md:py-28">
        <div className="container max-w-6xl mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="text-center mb-14"
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold mb-3">
              How It Works
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground max-w-xl mx-auto">
              Five simple steps from stuck to confirmed.
            </motion.p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-5">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                variants={fadeUp}
                custom={i + 2}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                className="text-center"
              >
                <div className="relative mx-auto mb-4">
                  <div className="flex items-center justify-center h-16 w-16 mx-auto rounded-2xl bg-primary/10 border border-primary/20">
                    <s.icon className="h-7 w-7 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <Features />

      {/* Technical Details */}
      <Faqs />

      {/* CTA */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent">
        <div className="container max-w-6xl mx-auto px-4 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold mb-4"
          >
            Ready to Unstuck a Transaction?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground mb-8 max-w-lg mx-auto"
          >
            Try the fee bumping service on regtest and learn how anchor outputs work in practice.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Button asChild size="lg" className="text-base gap-2">
              <Link to="/app">
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
