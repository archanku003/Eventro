import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Users, Target, Award, Heart } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 bg-gradient-hero">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center text-primary-foreground">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                About Eventro
              </h1>
              <p className="text-lg opacity-90">
                Revolutionizing college event management and student engagement
                through innovative technology
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                Our Mission
              </h2>
              <p className="text-lg text-muted-foreground text-center mb-12">
                Eventro is dedicated to transforming the college experience by
                providing a comprehensive platform for event discovery,
                registration, and management. We believe that campus events are
                crucial for student development, networking, and creating
                lasting memories.
              </p>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-card rounded-xl p-6 shadow-card">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-hero mb-4">
                    <Target className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Our Vision</h3>
                  <p className="text-muted-foreground">
                    To become the leading platform for college event management,
                    fostering vibrant campus communities across institutions
                    worldwide.
                  </p>
                </div>

                <div className="bg-card rounded-xl p-6 shadow-card">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-hero mb-4">
                    <Heart className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Our Values</h3>
                  <p className="text-muted-foreground">
                    Innovation, accessibility, and student-first approach guide
                    everything we do in creating meaningful event experiences.
                  </p>
                </div>

                <div className="bg-card rounded-xl p-6 shadow-card">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-hero mb-4">
                    <Users className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Community</h3>
                  <p className="text-muted-foreground">
                    Building strong connections between students, organizers,
                    and institutions through seamless event management.
                  </p>
                </div>

                <div className="bg-card rounded-xl p-6 shadow-card">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-hero mb-4">
                    <Award className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Excellence</h3>
                  <p className="text-muted-foreground">
                    Committed to delivering high-quality features and
                    exceptional user experience for all stakeholders.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-primary mb-2">
                  5000+
                </div>
                <div className="text-muted-foreground">Active Students</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-secondary mb-2">
                  500+
                </div>
                <div className="text-muted-foreground">Events Hosted</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-accent mb-2">50+</div>
                <div className="text-muted-foreground">Partner Colleges</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
