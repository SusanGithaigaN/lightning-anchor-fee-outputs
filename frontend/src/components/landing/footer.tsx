import React from 'react'
import { AlertTriangle, Github, Linkedin, BookOpen } from 'lucide-react'

export const Footer = () => {
    return (
        <>
            <footer className="border-t border-border py-12">
                <div className="container max-w-6xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-center md:text-left">
                            <p className="font-semibold">Built by Susan Githaiga</p>
                            <a href='https://dev.to/susangithaigan/understanding-lightning-network-anchor-outputs-part-1-the-basics-2p7j'
                                target='_blank'
                                rel='noopener noreferrer'
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <p>
                                    Read the accompanying articles on Dev.to to understand this project
                                </p>
                            </a>
                        </div>

                        <div className="flex items-center gap-4">
                            <a
                                href="https://github.com/SusanGithaigaN"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="GitHub"
                            >
                                <Github className="h-5 w-5" />
                            </a>
                            <a
                                href="https://www.linkedin.com/in/susan-githaiga-2832b11aa/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="LinkedIn"
                            >
                                <Linkedin className="h-5 w-5" />
                            </a>
                            <a
                                href="https://dev.to/susangithaigan"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="Dev.to Articles"
                            >
                                <BookOpen className="h-5 w-5" />
                            </a>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-border text-center">
                        <p className="text-xs text-muted-foreground/70 flex items-center justify-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Kindly note that this is currently an educational project and runs on Regtest only
                        </p>
                    </div>
                </div>
            </footer>
        </>
    )
}
export default Footer;