import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { loginSchema, type LoginFormData, type User } from "@shared/schema";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await apiRequest<{ user: User }>("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      toast({
        title: "Login successful",
        description: `Welcome back, ${response.user.firstName}!`,
      });

      // Invalidate user query to refetch with new session
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });

      // Redirect based on role
      const roleRedirects: Record<string, string> = {
        customer: "/customer/dashboard",
        workshop: "/workshop/dashboard",
        supplier: "/supplier/dashboard",
        runner: "/runner/dashboard",
        towing: "/towing/dashboard",
        admin: "/admin/dashboard",
        staff: "/staff/dashboard",
      };

      const redirectPath = roleRedirects[response.user.role] || "/";
      setLocation(redirectPath);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Invalid email or password",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-primary/20 shadow-2xl backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-4">
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <img 
                src="/assets/logo/garagehub-logo.jpg?v=20251110" 
                alt="GarageHub" 
                className="h-24 w-auto object-contain mb-2"
                style={{ filter: 'drop-shadow(0 0 20px rgba(0, 183, 255, 0.7))' }}
              />
            </motion.div>
            <motion.div
              className="flex items-center gap-2 justify-center"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <LogIn className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl font-semibold">Login to Dashboard</CardTitle>
            </motion.div>
            <CardDescription className="text-center">
              Enter your credentials to access your dashboard
            </CardDescription>
          </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        {...field}
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          {...field}
                          data-testid="input-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-remember-me"
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      Remember me for 7 days
                    </FormLabel>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-submit"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-login-replit"
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 5.5C7 4.67157 7.67157 4 8.5 4H15.5C15.7761 4 16 4.22386 16 4.5V7.5C16 7.77614 15.7761 8 15.5 8H8.5C7.67157 8 7 7.32843 7 6.5V5.5Z" fill="currentColor"/>
                  <path d="M7 14.5C7 13.6716 7.67157 13 8.5 13H23.5C24.3284 13 25 13.6716 25 14.5V15.5C25 16.3284 24.3284 17 23.5 17H8.5C7.67157 17 7 16.3284 7 15.5V14.5Z" fill="currentColor"/>
                  <path d="M7 23.5C7 22.6716 7.67157 22 8.5 22H18.5C18.7761 22 19 22.2239 19 22.5V25.5C19 25.7761 18.7761 26 18.5 26H8.5C7.67157 26 7 25.3284 7 24.5V23.5Z" fill="currentColor"/>
                </svg>
                Log in with Replit
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <motion.div
            className="text-sm text-center text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Don't have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline font-medium" data-testid="link-signup">
              Create an account
            </Link>
          </motion.div>
        </CardFooter>
      </Card>
      </motion.div>
    </div>
  );
}
