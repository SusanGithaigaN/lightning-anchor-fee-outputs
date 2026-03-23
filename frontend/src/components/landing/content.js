import {
    Zap,
    Clock,
    Lock,
    AlertTriangle,
    ArrowRight,
    Search,
    Calculator,
    CreditCard,
    Radio,
    CheckCircle2,
    Activity,
    Target,
    Bolt,
    Shield,
    Cpu,
    Code2,
    Anchor,
    Globe,
} from "lucide-react";


export const techDetails = [
    { icon: Globe, label: "Built for Bitcoin regtest/testnet environments" },
    { icon: Anchor, label: "Uses anchor outputs with the 330-sat limitation" },
    { icon: Cpu, label: "Child-Pays-For-Parent (CPFP) transaction building" },
    { icon: Code2, label: "Open source — explore, learn, and contribute" },
];

export const problems = [
    { icon: AlertTriangle, title: "Force-Close Fees Too Low", desc: "Lightning channels can force-close with fee rates that are too low for the current mempool." },
    { icon: Clock, title: "Stuck in Mempool", desc: "Commitment transactions sit unconfirmed, waiting for block space that never comes." },
    { icon: Lock, title: "Funds Locked", desc: "Your sats are locked in limbo until the transaction finally confirms — sometimes days." },
];

export const features = [
    { icon: Activity, title: "Real-time Mempool Monitoring", desc: "Track your transactions live as they move through the mempool." },
    { icon: Target, title: "Accurate Fee Estimation", desc: "Precise CPFP calculations so you pay exactly what's needed." },
    { icon: Bolt, title: "Lightning Payments", desc: "Instant, low-fee payments via the Lightning Network." },
    { icon: Shield, title: "Pay-per-Use", desc: "No subscriptions — pay only when you need a fee bump." },
];

export const steps = [
    { icon: Search, title: "Enter TXID", desc: "Paste your stuck transaction ID" },
    { icon: Calculator, title: "Fee Estimate", desc: "We calculate the CPFP cost" },
    { icon: CreditCard, title: "Pay via Lightning", desc: "Scan the invoice QR code" },
    { icon: Radio, title: "Broadcast", desc: "We submit the fee-bump tx" },
    { icon: CheckCircle2, title: "Confirmed", desc: "Both transactions confirm together" },
];

