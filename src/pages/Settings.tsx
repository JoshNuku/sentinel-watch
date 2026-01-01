import { useState } from "react";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  User, 
  Smartphone,
  Mail,
  Volume2,
  Eye,
  Moon,
  Globe,
  Save,
  Radio
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

const Settings = () => {
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    smsAlerts: true,
    pushNotifications: true,
    soundEnabled: true,
    criticalOnly: false,
  });

  const [display, setDisplay] = useState({
    darkMode: true,
    compactView: false,
    showInactive: true,
    animationsEnabled: true,
  });

  const [alertVolume, setAlertVolume] = useState([75]);

  const handleSave = () => {
    toast.success("Settings saved successfully");
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm">Configure your dashboard preferences</p>
        </div>
        <Button variant="glow" onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="glass w-full sm:w-auto flex-wrap h-auto p-1">
          <TabsTrigger value="notifications" className="flex items-center gap-2 data-[state=active]:bg-primary/10">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="display" className="flex items-center gap-2 data-[state=active]:bg-primary/10">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Display</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 data-[state=active]:bg-primary/10">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2 data-[state=active]:bg-primary/10">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass rounded-xl p-6 space-y-6">
              <h3 className="font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                Alert Channels
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      Email Alerts
                    </Label>
                    <p className="text-xs text-muted-foreground">Receive alerts via email</p>
                  </div>
                  <Switch 
                    checked={notifications.emailAlerts}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailAlerts: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      SMS Alerts
                    </Label>
                    <p className="text-xs text-muted-foreground">Get SMS for critical alerts</p>
                  </div>
                  <Switch 
                    checked={notifications.smsAlerts}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, smsAlerts: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      Push Notifications
                    </Label>
                    <p className="text-xs text-muted-foreground">Browser push notifications</p>
                  </div>
                  <Switch 
                    checked={notifications.pushNotifications}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, pushNotifications: checked }))}
                  />
                </div>
              </div>
            </div>

            <div className="glass rounded-xl p-6 space-y-6">
              <h3 className="font-semibold flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-primary" />
                Sound Settings
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sound Enabled</Label>
                    <p className="text-xs text-muted-foreground">Play sound on new alerts</p>
                  </div>
                  <Switch 
                    checked={notifications.soundEnabled}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, soundEnabled: checked }))}
                  />
                </div>
                <div className="space-y-3">
                  <Label>Alert Volume</Label>
                  <Slider
                    value={alertVolume}
                    onValueChange={setAlertVolume}
                    max={100}
                    step={1}
                    disabled={!notifications.soundEnabled}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground text-right">{alertVolume}%</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Critical Alerts Only</Label>
                    <p className="text-xs text-muted-foreground">Sound for high-priority only</p>
                  </div>
                  <Switch 
                    checked={notifications.criticalOnly}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, criticalOnly: checked }))}
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Display Tab */}
        <TabsContent value="display" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass rounded-xl p-6 space-y-6">
              <h3 className="font-semibold flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Appearance
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Moon className="h-4 w-4 text-muted-foreground" />
                      Dark Mode
                    </Label>
                    <p className="text-xs text-muted-foreground">Use dark theme</p>
                  </div>
                  <Switch 
                    checked={display.darkMode}
                    onCheckedChange={(checked) => setDisplay(prev => ({ ...prev, darkMode: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Compact View</Label>
                    <p className="text-xs text-muted-foreground">Reduce spacing and padding</p>
                  </div>
                  <Switch 
                    checked={display.compactView}
                    onCheckedChange={(checked) => setDisplay(prev => ({ ...prev, compactView: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Animations</Label>
                    <p className="text-xs text-muted-foreground">Smooth transitions and effects</p>
                  </div>
                  <Switch 
                    checked={display.animationsEnabled}
                    onCheckedChange={(checked) => setDisplay(prev => ({ ...prev, animationsEnabled: checked }))}
                  />
                </div>
              </div>
            </div>

            <div className="glass rounded-xl p-6 space-y-6">
              <h3 className="font-semibold flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary" />
                Sentinel Display
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Inactive Sentinels</Label>
                    <p className="text-xs text-muted-foreground">Display offline units on map</p>
                  </div>
                  <Switch 
                    checked={display.showInactive}
                    onCheckedChange={(checked) => setDisplay(prev => ({ ...prev, showInactive: checked }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Map Style</Label>
                  <Select defaultValue="satellite">
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="satellite">Satellite</SelectItem>
                      <SelectItem value="terrain">Terrain</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Refresh Interval</Label>
                  <Select defaultValue="30">
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 seconds</SelectItem>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">1 minute</SelectItem>
                      <SelectItem value="300">5 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <div className="glass rounded-xl p-6 space-y-6 max-w-2xl">
            <h3 className="font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Security Settings
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Two-Factor Authentication</Label>
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50">
                  <div>
                    <p className="font-medium">2FA Status</p>
                    <p className="text-sm text-muted-foreground">Add extra security to your account</p>
                  </div>
                  <Button variant="outline" size="sm">Enable</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Session Management</Label>
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50">
                  <div>
                    <p className="font-medium">Active Sessions</p>
                    <p className="text-sm text-muted-foreground">1 device currently logged in</p>
                  </div>
                  <Button variant="outline" size="sm">View All</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Change Password</Label>
                <div className="grid gap-3">
                  <Input type="password" placeholder="Current password" className="bg-background/50" />
                  <Input type="password" placeholder="New password" className="bg-background/50" />
                  <Input type="password" placeholder="Confirm new password" className="bg-background/50" />
                  <Button className="w-full sm:w-auto">Update Password</Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <div className="glass rounded-xl p-6 space-y-6 max-w-2xl">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Account Information
            </h3>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input defaultValue="Kwame" className="bg-background/50" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input defaultValue="Asante" className="bg-background/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input type="email" defaultValue="kwame.asante@orion.gov.gh" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input type="tel" defaultValue="+233 20 123 4567" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value="Field Operator" disabled className="bg-background/30" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  Language
                </Label>
                <Select defaultValue="en">
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="tw">Twi</SelectItem>
                    <SelectItem value="ga">Ga</SelectItem>
                    <SelectItem value="ee">Ewe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
