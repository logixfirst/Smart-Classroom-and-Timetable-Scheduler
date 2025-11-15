'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ProfileSettings() {
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src="/placeholder-avatar.jpg" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">Profile Settings</h1>
            <p className="text-muted-foreground">Tuesday, Oct 15</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" defaultValue="FeedbackID" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" defaultValue="Concerned Needed" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailAddress">Email Address</Label>
              <Input id="emailAddress" defaultValue="In App Alerts" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input id="employeeId" defaultValue="Instructional Method" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input id="department" defaultValue="In App Alerts" />
            </div>
          </CardContent>
        </Card>

        {/* Account Security */}
        <Card>
          <CardHeader>
            <CardTitle>Account Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Full Names</Label>
                <p className="text-sm text-muted-foreground">Password</p>
              </div>
              <div className="text-right">
                <p className="text-sm">Password</p>
                <p className="text-xs text-muted-foreground">Create Recovery at</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Password</Label>
                <p className="text-sm text-muted-foreground">Confirm Reset</p>
              </div>
              <div className="text-right">
                <p className="text-sm">Clicking Password</p>
                <p className="text-xs text-muted-foreground">Change Password</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Notification Preferences</h3>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Quotient Notifications</Label>
                  <p className="text-xs text-muted-foreground">Available</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>In App Alerts</Label>
                  <p className="text-xs text-muted-foreground">In App</p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Leave Required</Label>
                  <p className="text-xs text-muted-foreground">Leave Instructional</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <Button variant="outline">Cancel</Button>
        <Button>Save Changes</Button>
      </div>
    </div>
  )
}
