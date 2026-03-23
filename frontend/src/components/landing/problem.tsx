import React from 'react'
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { fadeUp } from "@/pages/Landing";
import { problems } from "@/components/landing/content";


export const Problem = () => {
    return (
        <>
            <section className="py-20 md:py-28 bg-muted/30">
                <div className="container max-w-6xl mx-auto px-4">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-80px" }}
                        className="text-center mb-14"
                    >
                        <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold mb-3">
                            The Problem
                        </motion.h2>
                        <motion.p variants={fadeUp} custom={1} className="text-muted-foreground max-w-xl mx-auto">
                            When Lightning channels force-close during fee spikes, your funds can get stuck.
                        </motion.p>
                    </motion.div>

                    <div className="grid gap-6 md:grid-cols-3">
                        {problems.map((p, i) => (
                            <motion.div
                                key={p.title}
                                variants={fadeUp}
                                custom={i + 2}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-60px" }}
                            >
                                <Card className="h-full border-destructive/20 bg-destructive/5">
                                    <CardContent className="p-6 space-y-3">
                                        <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-destructive/10">
                                            <p.icon className="h-6 w-6 text-destructive" />
                                        </div>
                                        <h3 className="font-semibold text-lg">{p.title}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section></>
    )
}
export default Problem;