import mongoose, { Schema, Document } from 'mongoose';
import { IAlert, ThreatType, Location } from '../types';

export interface AlertDocument extends IAlert, Document {}

const LocationSchema = new Schema<Location>(
  {
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    lng: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    }
  },
  { _id: false }
);

const AlertSchema = new Schema<AlertDocument>(
  {
    sentinelId: {
      type: String,
      required: true,
      ref: 'Sentinel',
      uppercase: true
    },
    threatType: {
      type: String,
      enum: Object.values(ThreatType),
      required: true
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      validate: {
        validator: function(v: number) {
          return v >= 0 && v <= 1;
        },
        message: 'Confidence must be between 0 and 1'
      }
    },
    location: {
      type: LocationSchema,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    imageUrl: {
      type: String,
      default: null
    }
    ,
    triggerType: {
      type: String,
      trim: true
    },
    triggeredSensors: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for efficient queries
AlertSchema.index({ sentinelId: 1 });
AlertSchema.index({ timestamp: -1 });
AlertSchema.index({ threatType: 1 });
AlertSchema.index({ isVerified: 1 });
AlertSchema.index({ confidence: -1 });

// Compound index for common queries
AlertSchema.index({ sentinelId: 1, timestamp: -1 });

// Virtual to get confidence percentage
AlertSchema.virtual('confidencePercent').get(function() {
  return Math.round(this.confidence * 100);
});

// Virtual to check if alert is recent (last hour)
AlertSchema.virtual('isRecent').get(function() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return this.timestamp > oneHourAgo;
});

export const Alert = mongoose.model<AlertDocument>('Alert', AlertSchema);
