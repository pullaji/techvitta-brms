import { useState } from "react";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Database,
  Download,
  Upload,
  Eye,
  EyeOff,
  Save,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    autoBackup: false,
    darkMode: false,
  });
  const { toast } = useToast();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwords.new !== passwords.confirm) {
      toast({
        title: "Password mismatch",
        description: "New passwords don't match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setIsSaving(false);
    setPasswords({ current: "", new: "", confirm: "" });
    
    toast({
      title: "Password updated",
      description: "Your password has been successfully updated.",
    });
  };

  const handleExportData = async () => {
    setIsExporting(true);
    
    // Simulate export process
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setIsExporting(false);
    
    toast({
      title: "Data exported successfully",
      description: "Your complete data backup has been generated and downloaded.",
    });
  };

  const handleDeleteAllData = () => {
    toast({
      title: "Confirm data deletion",
      description: "This action cannot be undone. Please contact support to delete all data.",
      variant: "destructive",
    });
  };

  const handlePreferenceChange = async (key: string, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    
    // Show immediate feedback
    toast({
      title: "Preference updated",
      description: `${key === 'emailNotifications' ? 'Email notifications' : 
                   key === 'autoBackup' ? 'Automatic backup' : 
                   'Dark mode'} ${value ? 'enabled' : 'disabled'}`,
    });

    // Simulate saving to backend
    try {
      // Here you would normally save to your backend
      console.log('Saving preference:', key, value);
    } catch (error) {
      // Revert on error
      setPreferences(prev => ({ ...prev, [key]: !value }));
      toast({
        title: "Error",
        description: "Failed to save preference. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 sm:mb-8"
        >
          <h1 className="heading-xl text-2xl sm:text-3xl lg:text-4xl mb-2">Settings</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your account settings, security, and preferences
          </p>
        </motion.div>

        <div className="space-y-6 sm:space-y-8">
          {/* Account Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <Card className="card-elevated p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="heading-md text-xl">Account Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    defaultValue="Administrator"
                    className="h-11"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue="admin@brms.com"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    defaultValue="+91 98765 43210"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization">Organization</Label>
                  <Input
                    id="organization"
                    defaultValue="BRMS Inc."
                    className="h-11"
                  />
                </div>
              </div>

              <div className="mt-6">
                <Button className="btn-gradient">
                  <Save className="w-4 h-4 mr-2" />
                  Update Profile
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Security Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Card className="card-elevated p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-red-50 rounded-lg">
                  <Shield className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="heading-md text-xl">Security Settings</h2>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwords.current}
                      onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                      placeholder="Enter current password"
                      className="h-11 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={passwords.new}
                        onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                        placeholder="Enter new password"
                        className="h-11 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                      placeholder="Confirm new password"
                      className="h-11"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSaving || !passwords.current || !passwords.new || !passwords.confirm}
                  className="btn-gradient"
                >
                  {isSaving ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                      />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Update Password
                    </>
                  )}
                </Button>
              </form>
            </Card>
          </motion.div>

          {/* Preferences */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card className="card-elevated p-4 sm:p-6">
              <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <SettingsIcon className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="heading-md text-lg sm:text-xl">Preferences</h2>
              </div>

              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-4">
                    <h3 className="font-medium text-sm sm:text-base">Email Notifications</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Receive email updates about uploads and reports
                    </p>
                  </div>
                  <Switch
                    checked={preferences.emailNotifications}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange('emailNotifications', checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-4">
                    <h3 className="font-medium text-sm sm:text-base">Automatic Backup</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Automatically backup your data weekly
                    </p>
                  </div>
                  <Switch
                    checked={preferences.autoBackup}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange('autoBackup', checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-4">
                    <h3 className="font-medium text-sm sm:text-base">Dark Mode</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Use dark theme across the application
                    </p>
                  </div>
                  <Switch
                    checked={preferences.darkMode}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange('darkMode', checked)
                    }
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Data Management */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Card className="card-elevated p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Database className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="heading-md text-xl">Data Management</h2>
              </div>

              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium mb-1">Export All Data</h3>
                    <p className="text-sm text-muted-foreground">
                      Download a complete backup of all your financial data
                    </p>
                  </div>
                  <Button
                    onClick={handleExportData}
                    disabled={isExporting}
                    variant="outline"
                    className="ml-4"
                  >
                    {isExporting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2"
                        />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Export Data
                      </>
                    )}
                  </Button>
                </div>

                <Separator />

                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium mb-1 text-destructive">Delete All Data</h3>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete all your data. This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    onClick={handleDeleteAllData}
                    variant="destructive"
                    className="ml-4"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete All
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Help & Support */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Card className="card-elevated p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="heading-md text-xl">Need Help?</h2>
              </div>
              
              <p className="text-muted-foreground mb-4">
                If you need assistance with your account or have questions about BRMS, 
                our support team is here to help.
              </p>
              
              <div className="flex space-x-3">
                <Button variant="outline">Contact Support</Button>
                <Button variant="outline">View Documentation</Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}