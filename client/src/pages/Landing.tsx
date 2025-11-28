import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Package, Truck, TowerControl, User, Wrench } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center space-y-6">
            <div className="flex justify-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Building2 className="h-10 w-10" />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              GarageHub System
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Complete automotive workshop ecosystem connecting workshops, suppliers, runners, 
              towing services, and customers in one digital platform.
            </p>
            <div className="flex justify-center gap-4 pt-4">
              <Button
                size="lg"
                onClick={() => (window.location.href = "/api/login")}
                data-testid="button-login"
              >
                Get Started
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => (window.location.href = "/api/login")}
                data-testid="button-signup"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">Who We Serve</h2>
          <p className="text-muted-foreground mt-2">
            A comprehensive platform for every role in the automotive ecosystem
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover-elevate">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary mb-4">
                <Building2 className="h-6 w-6" />
              </div>
              <CardTitle>Workshops</CardTitle>
              <CardDescription>
                Manage customers, jobs, inventory, and financials all in one place
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• Job tracking and management</li>
                <li>• Order parts from suppliers</li>
                <li>• Customer relationship management</li>
                <li>• Financial analytics and reporting</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary mb-4">
                <Package className="h-6 w-6" />
              </div>
              <CardTitle>Suppliers</CardTitle>
              <CardDescription>
                List parts, manage orders, and grow your automotive parts business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• Parts catalog management</li>
                <li>• Order fulfillment tracking</li>
                <li>• Inventory management</li>
                <li>• Sales analytics</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary mb-4">
                <Truck className="h-6 w-6" />
              </div>
              <CardTitle>Runners</CardTitle>
              <CardDescription>
                Deliver parts from suppliers to workshops with ease
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• Available delivery jobs</li>
                <li>• Route optimization</li>
                <li>• Earnings tracking</li>
                <li>• Delivery history</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary mb-4">
                <TowerControl className="h-6 w-6" />
              </div>
              <CardTitle>Towing Services</CardTitle>
              <CardDescription>
                Accept towing requests and connect customers to workshops
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• Towing request management</li>
                <li>• Workshop coordination</li>
                <li>• Service tracking</li>
                <li>• Revenue reporting</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary mb-4">
                <User className="h-6 w-6" />
              </div>
              <CardTitle>Customers</CardTitle>
              <CardDescription>
                Book services, track repairs, and request towing assistance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• Find and book workshops</li>
                <li>• Track service progress</li>
                <li>• Request towing services</li>
                <li>• Service history</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary mb-4">
                <Wrench className="h-6 w-6" />
              </div>
              <CardTitle>Real-Time Tracking</CardTitle>
              <CardDescription>
                Stay updated with live order and service tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• Order status updates</li>
                <li>• Delivery tracking</li>
                <li>• Job progress monitoring</li>
                <li>• Instant notifications</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Ready to get started?</h2>
            <p className="text-muted-foreground">
              Join the automotive ecosystem that connects everyone
            </p>
            <Button
              size="lg"
              onClick={() => (window.location.href = "/api/login")}
              data-testid="button-cta-login"
            >
              Sign In Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
