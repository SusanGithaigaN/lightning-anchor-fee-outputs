import React from 'react'
import { motion } from "framer-motion";
import {ExternalLink} from "lucide-react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { fadeUp } from "@/pages/Landing";
import { techDetails } from "@/components/landing/content";

export const Faqs = () => {
    return (
        <>
            <section className="py-20 md:py-28">
                <div className="container max-w-6xl mx-auto px-4 max-w-3xl">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-80px" }}
                        className="text-center mb-10"
                    >
                        <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold mb-3">
                            Technical Details
                        </motion.h2>
                        <motion.p variants={fadeUp} custom={1} className="text-muted-foreground">
                            Under the hood of this educational project.
                        </motion.p>
                    </motion.div>

                    <motion.div
                        variants={fadeUp}
                        custom={2}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-60px" }}
                    >
                        <Accordion type="single" collapsible className="w-full">
                            {techDetails.map((t, i) => (
                                <AccordionItem key={i} value={`item-${i}`}>
                                    <AccordionTrigger className="text-left">
                                        <span className="flex items-center gap-3">
                                            <t.icon className="h-5 w-5 text-primary shrink-0" />
                                            {t.label}
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="text-muted-foreground">
                                        {i === 0 && "This service is designed for Bitcoin regtest and testnet environments. It's a learning tool — not for mainnet use. Perfect for understanding how anchor outputs work in practice."}
                                        {i === 1 && "Anchor outputs are special 330-satoshi outputs added to commitment transactions. They allow either channel party to fee-bump the transaction using CPFP, ensuring timely confirmation even during fee spikes."}
                                        {i === 2 && "Child-Pays-For-Parent creates a child transaction that spends the anchor output with a high enough fee to incentivize miners to confirm both the parent and child together."}
                                        {i === 3 && (
                                            <span>
                                                The full source code is available on{" "}
                                                <a
                                                    href="https://github.com/SusanGithaigaN/lightning-anchor-fee-outputs"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline inline-flex items-center gap-1"
                                                >
                                                    GitHub <ExternalLink className="h-3 w-3" />
                                                </a>
                                                . Contributions, issues, and feedback are welcome!
                                            </span>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </motion.div>
                </div>
            </section>
        </>
    )
}
export default Faqs;