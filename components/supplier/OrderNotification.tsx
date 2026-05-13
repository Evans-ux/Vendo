"use client";

import { useEffect, useRef } from "react";

interface OrderNotificationProps {
  onNewOrder?: () => void;
}

export default function OrderNotification({ onNewOrder }: OrderNotificationProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element for notification sound
    audioRef.current = new Audio("/notification.mp3");
  }, []);

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch((err) => {
        console.error("Failed to play notification sound:", err);
      });
    }
  };

  // This would be called when a new order is received
  // In production, you'd use WebSockets or polling
  useEffect(() => {
    if (onNewOrder) {
      // Example: Poll for new orders every 30 seconds
      const interval = setInterval(() => {
        // Check for new orders logic here
        // If new order found, call playNotificationSound()
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [onNewOrder]);

  return null; // This is a utility component with no UI
}
