import React from 'react'
import { motion } from "framer-motion";
import { fadeUp } from "@/pages/Landing";
import { Card, CardContent } from "@/components/ui/card";
import { features } from "@/components/landing/content";

export const Features = () => {
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
                            Features
                        </motion.h2>
                    </motion.div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {features.map((f, i) => (
                            <motion.div
                                key={f.title}
                                variants={fadeUp}
                                custom={i}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-60px" }}
                            >
                                <Card className="h-full">
                                    <CardContent className="p-6 space-y-3">
                                        <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-secondary/10">
                                            <f.icon className="h-6 w-6 text-secondary" />
                                        </div>
                                        <h3 className="font-semibold">{f.title}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>
        </>
    )
}

export default Features;