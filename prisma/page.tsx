'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export default function AdminSettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage platform configurations and preferences.</p>
      </div>
      
      <Separator />

      <div className="grid gap-6 max-w-2xl">
        <Card className="bg-card text-card-foreground shadow-sm">
          <CardHeader>
            <CardTitle>Platform Commission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="commission">Default Markup (%)</Label>
              <div className="flex items-center gap-4">
                <Input id="commission" type="number" defaultValue="10" className="w-32 bg-background border-input" />
                <span className="text-sm text-muted-foreground">Applied to base prices (10% = supplier earns base price, Vendo keeps markup).</span>
              </div>
            </div>
            <Button className="bg-brand-orange hover:bg-brand-orange/90">Save Changes</Button>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground shadow-sm">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Admin Email Alerts</Label>
                <p className="text-sm text-muted-foreground">Receive emails for new KYC submissions.</p>
              </div>
              {/* Add a Switch component here if available */}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}