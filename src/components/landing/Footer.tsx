import { Radar, Github, Twitter, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="py-12 border-t border-border">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-3">
            <Radar className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">
              Project <span className="text-gradient">ORION</span>
            </span>
          </Link>

          <p className="text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} Project ORION. Protecting Ghana's ecosystems.
          </p>

          <div className="flex items-center gap-4">
            <a 
              href="#" 
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors"
            >
              <Twitter className="h-5 w-5 text-muted-foreground hover:text-primary" />
            </a>
            <a 
              href="#" 
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors"
            >
              <Github className="h-5 w-5 text-muted-foreground hover:text-primary" />
            </a>
            <a 
              href="#" 
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors"
            >
              <Linkedin className="h-5 w-5 text-muted-foreground hover:text-primary" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
