import React from 'react'
import { motion } from "framer-motion";
import { ArrowRight, Github } from 'lucide-react'
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const Hero = () => {
    return (
        <>
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
                <div className="container max-w-6xl mx-auto px-4 py-24 md:py-36 text-center relative">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="text-4xl md:text-6xl font-bold tracking-tight mb-4"
                    >
                        Unstuck Your Lightning
                        <span className="block bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            Transactions
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35, duration: 0.5 }}
                        className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
                    >
                        Fee bump stuck commitment transactions using anchor outputs and CPFP.
                    </motion.p>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35, duration: 0.5 }}
                        className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
                    >
                        Powered by the Lightning Network.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center"
                    >
                        <Button asChild size="lg" className="text-base gap-2">
                            <Link to="/app">
                                Get Started <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="lg" className="text-base gap-2">
                            <a
                                href="https://github.com/SusanGithaigaN/lightning-anchor-fee-outputs"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Github className="h-4 w-4" /> View on GitHub
                            </a>
                        </Button>
                    </motion.div>
                </div>
            </section>
        </>
    )
}

export default Hero;