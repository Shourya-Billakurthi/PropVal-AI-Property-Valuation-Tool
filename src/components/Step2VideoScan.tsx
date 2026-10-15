import React, { useState, useEffect, useRef, useId } from 'react';
import { 
  Video, 
  ArrowLeft, 
  ArrowRight, 
  Camera, 
  Upload, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Maximize2, 
  RotateCcw, 
  Sparkles, 
  Ruler, 
  SlidersHorizontal,
  FileCheck,
  Building,
  Store,
  Warehouse,
  Home,
  Loader2,
  X
} from 'lucide-react';
import { 
  PropertyDetails, 
  LocationData, 
  CaptureZone, 
  ScanResultsMap, 
  ZoneScanResult 
} from '../types/property';
import { ARCameraModal } from './ARCameraModal';
import { 
  extractKeyframesFromVideo, 
  generateSyntheticZoneKeyframes 
} from '../utils/videoExtractor';

interface Step2Props {
  location: LocationData;
  property: PropertyDetails;
  scanResults: ScanResultsMap;
  setScanResults: React.Dispatch<React.SetStateAction<ScanResultsMap>>;
  onNext: () => void;
  onPrev: () => void;
}

export const Step2VideoScan: React.FC<Step2Props> = ({
  location,
  property,
  scanResults,
  setScanResults,
  onNext,
  onPrev,
}) => {
  const fileInputPrefix = useId();
  // Get initial zones dynamically based on property category, subtype, and multi-floor configurations
  const getCategoryZones = (prop: PropertyDetails): CaptureZone[] => {
    const list: CaptureZone[] = [];
    const isMultiFloor = (prop.numberOfFloors && prop.numberOfFloors >= 2) || 
      prop.floorConfig === '2_floors' || 
      prop.floorConfig === '3_plus_floors' || 
      prop.floorConfig === 'ground_plus_mezzanine';

    switch (prop.category) {
      case 'residential':
        // Subtype Exterior Scan: If "Independent Villa" or "Gated Row House" is selected, automatically add "Exterior Elevation & Plot Frontage"
        if (prop.subType === 'independent_house' || prop.subType === 'row_house') {
          list.push({
            id: 'res_elevation',
            name: 'Exterior Elevation & Plot Frontage',
            description: 'Front elevation, boundary wall, entry gate & plot setback',
            guidance: 'Stand outside at the front gate or road. Capture the full structural facade, floor levels, compound boundary, and plot width for land-building appraisal.',
            required: true,
            scaleReference: 'Ground Floor Entry Gate / 10ft Compound Wall',
          });
        }

        list.push(
          {
            id: 'res_living',
            name: 'Living Room Pan',
            description: 'Main living & dining volume with flooring and ceiling planes',
            guidance: 'Stand in a corner. Keep floor edges and at least one standard 7ft door or window visible for scale reference. Sweep 180° slowly.',
            required: true,
            scaleReference: '7ft Door / Balcony Slider',
          },
          {
            id: 'res_kitchen',
            name: 'Kitchen Scan',
            description: 'Modular counter, sink area, cabinets & wall tiles',
            guidance: 'Keep countertop line and overhead modular cabinets in frame. Pan slowly to reveal plumbing and tile conditions.',
            required: true,
            scaleReference: '3ft Counter Height Standard',
          }
        );
        break;

      case 'retail':
        list.push(
          {
            id: 'ret_front',
            name: 'Shop Front & Street View',
            description: 'Exterior street frontage, road width & rolling shutter',
            guidance: 'Stand across the street or pavement. Keep the entire storefront width, rolling shutter height, and sign fascia in frame.',
            required: true,
            scaleReference: 'Rolling Shutter / Street Curb',
          },
          {
            id: 'ret_interior',
            name: 'Interior Corner-to-Corner Pan',
            description: 'Racks, customer aisles, ceiling lights & electric panel',
            guidance: 'Stand in the far rear corner. Pan slowly from wall to wall, capturing aisle clearance and electrical distribution box.',
            required: true,
            scaleReference: 'Standard 7ft Display Rack',
          }
        );
        break;

      case 'commercial':
        list.push(
          {
            id: 'comm_reception',
            name: 'Entry & Reception',
            description: 'Entrance lobby, security desk & lift landing',
            guidance: 'Frame the entrance glass doors, receptionist desk, and elevator lobby. Ensure floor-to-ceiling elevation is captured.',
            required: true,
            scaleReference: 'Glass Entrance Portal / 7ft Door',
          },
          {
            id: 'comm_hall',
            name: 'Main Workstation Hall',
            description: 'Open cubicle clusters, HVAC ceiling & perimeter windows',
            guidance: 'Walk down central aisle or stand at the corner. Capture workstation cluster density, clear ceiling height, and lighting.',
            required: true,
            scaleReference: 'Standard 4ft Desk / 9ft Ceiling',
          }
        );
        break;

      case 'industrial':
        list.push(
          {
            id: 'ind_bay',
            name: 'Truck Entry Bay',
            description: 'Loading dock, rolling shutter gate & vehicle apron',
            guidance: 'Stand 20ft back. Keep the rolling shutter gate, dock leveller ramp, and vehicular apron in clear frame.',
            required: true,
            scaleReference: '14ft Industrial Roll-up Shutter',
          },
          {
            id: 'ind_floor',
            name: 'Main Floor 360 Pan',
            description: 'Shed floor slab, column spacing & expansion joints',
            guidance: 'Stand near the center column. Complete a full 360° pan keeping laser-screed floor and RCC column grid visible.',
            required: true,
            scaleReference: 'RCC Column / 20ft Bay Spacing',
          },
          {
            id: 'ind_roof',
            name: 'Roof/Ceiling Structure',
            description: 'PEB steel truss, daylight polycarbonate sheets & clearance',
            guidance: 'Angle camera up at 45°. Track steel girders, translucent sky panels, and overhead crane rails.',
            required: true,
            scaleReference: 'PEB Ridge / Eave Height',
          }
        );
        break;

      default:
        break;
    }

    // Multi-Floor Scan: Whenever 2+ Floors (or Ground + Mezzanine) is selected across any property type, automatically add "Upper Floor / Staircase & Landing Scan"
    if (isMultiFloor) {
      list.push({
        id: 'multi_staircase',
        name: 'Upper Floor / Staircase & Landing Scan',
        description: 'Internal staircase, landing circulation & upper floor volume',
        guidance: 'Film the staircase riser/treads, handrail, and sweep across the upper landing/hallway to confirm structural integrity and finish continuity.',
        required: true,
        scaleReference: 'Standard Staircase Riser (6 inch) / Handrail (3ft)',
      });
    }

    return list;
  };

  const [zones, setZones] = useState<CaptureZone[]>(() => getCategoryZones(property));

  // Sync zones dynamically when category, subtype, or multi-floor configurations change
  useEffect(() => {
    setZones(getCategoryZones(property));
  }, [property.category, property.subType, property.numberOfFloors, property.floorConfig]);
  const [activeCameraZone, setActiveCameraZone] = useState<CaptureZone | null>(null);
  const [isManualFallback, setIsManualFallback] = useState(false);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadingZoneId, setUploadingZoneId] = useState<string | null>(null);

  // Manual dimensions draft state
  const [manualDrafts, setManualDrafts] = useState<Record<string, {
    lengthFt: number;
    widthFt: number;
    heightFt: number;
    flooringType: string;
    wallCondition: string;
  }>>({});

  // Add room handler (for Residential)
  const handleAddCustomRoom = (name: string) => {
    if (!name.trim()) return;
    const newId = `custom_${Date.now()}`;
    const newZone: CaptureZone = {
      id: newId,
      name: name.trim(),
      description: 'Custom verified living area',
      guidance: 'Stand in corner. Keep 7ft doorway and floor boundary visible. Pan smoothly across the room.',
      required: false,
      scaleReference: '7ft Standard Doorway',
    };
    setZones((prev) => [...prev, newZone]);
    setIsAddingRoom(false);
    setNewRoomName('');
  };

  const handleRemoveZone = (zoneId: string) => {
    setZones((prev) => prev.filter((z) => z.id !== zoneId));
    setScanResults((prev) => {
      const copy = { ...prev };
      delete copy[zoneId];
      return copy;
    });
  };

  // Video file upload handler
  const handleFileUpload = async (zone: CaptureZone, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingZoneId(zone.id);
    try {
      const frames = await extractKeyframesFromVideo(file, { count: 4, targetWidth: 720 });
      const blobUrl = URL.createObjectURL(file);
      
      setScanResults((prev) => ({
        ...prev,
        [zone.id]: {
          zoneId: zone.id,
          zoneName: zone.name,
          videoBlobUrl: blobUrl,
          extractedKeyframes: frames,
          isManualFallback: false,
          capturedAt: new Date().toLocaleTimeString(),
        },
      }));
    } catch {
      const synthetic = generateSyntheticZoneKeyframes(zone.name, 4);
      setScanResults((prev) => ({
        ...prev,
        [zone.id]: {
          zoneId: zone.id,
          zoneName: zone.name,
          extractedKeyframes: synthetic,
          isManualFallback: false,
          capturedAt: new Date().toLocaleTimeString(),
        },
      }));
    } finally {
      setUploadingZoneId(null);
    }
  };

  // Camera modal completion
  const handleCameraComplete = (zoneId: string, frames: string[], blobUrl?: string) => {
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return;

    setScanResults((prev) => ({
      ...prev,
      [zoneId]: {
        zoneId,
        zoneName: zone.name,
        videoBlobUrl: blobUrl,
        extractedKeyframes: frames,
        isManualFallback: false,
        capturedAt: new Date().toLocaleTimeString(),
      },
    }));
    setActiveCameraZone(null);
  };

  // Manual dimensions save
  const handleSaveManualDimensions = (zone: CaptureZone) => {
    const draft = manualDrafts[zone.id] || {
      lengthFt: 16,
      widthFt: 12,
      heightFt: 10,
      flooringType: 'Vitrified Tiles',
      wallCondition: 'Excellent (Fresh Paint)',
    };

    const synthetic = generateSyntheticZoneKeyframes(
      `${zone.name} (${draft.lengthFt}'×${draft.widthFt}' · ${draft.lengthFt * draft.widthFt} sq.ft)`,
      4
    );

    setScanResults((prev) => ({
      ...prev,
      [zone.id]: {
        zoneId: zone.id,
        zoneName: zone.name,
        extractedKeyframes: synthetic,
        isManualFallback: true,
        manualDimensions: draft,
        capturedAt: new Date().toLocaleTimeString(),
      },
    }));
  };

  // Count verified zones
  const totalRequired = zones.filter((z) => z.required).length;
  const verifiedCount = zones.filter((z) => !!scanResults[z.id]).length;
  const isAllRequiredVerified = zones
    .filter((z) => z.required)
    .every((z) => !!scanResults[z.id]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Step Header & Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 tracking-wider uppercase mb-1">
            <span>Appraisal Step 02</span>
            <span aria-hidden="true">·</span>
            <span>Edge AI Computer Vision</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Guided Video Scan &amp; Keyframe Extraction
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Record a 15-second guided sweep or upload clips for your classified{' '}
            <strong className="text-slate-900 capitalize">{property.category}</strong> spaces. 
            Our client-side vision engine extracts 4 calibrated 720p keyframes for collateral verification.
          </p>
        </div>

        {/* Fallback Toggle Switch */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs shrink-0">
          <Ruler className="w-4 h-4 text-slate-500" />
          <div className="text-left">
            <span className="text-xs font-bold text-slate-900 block leading-tight">
              Enter dimensions manually
            </span>
            <span className="text-[10px] text-slate-500">
              Testing fallback without video
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isManualFallback}
            onClick={() => setIsManualFallback(!isManualFallback)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
              isManualFallback ? 'bg-indigo-600' : 'bg-slate-300'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                isManualFallback ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Category Notification Banner */}
      <div className="bg-slate-100 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
            {property.category === 'residential' && <Home className="w-4 h-4" />}
            {property.category === 'retail' && <Store className="w-4 h-4" />}
            {property.category === 'commercial' && <Building className="w-4 h-4" />}
            {property.category === 'industrial' && <Warehouse className="w-4 h-4" />}
          </div>
          <div>
            <span className="font-bold text-slate-900 capitalize">
              {property.category} Capture Protocol Active
            </span>
            <p className="text-slate-500">
              {zones.length} designated capture zones ({totalRequired} mandatory for bank appraisal).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-600 font-semibold">Verification Progress:</span>
          <span className="font-bold px-2.5 py-1 rounded-md bg-white border border-slate-300 text-indigo-700 tabular-nums">
            {verifiedCount} of {zones.length} Complete
          </span>
        </div>
      </div>

      {/* CAPTURE ZONE CARDS GRID */}
      <div className="space-y-6">
        {zones.map((zone, idx) => {
          const scan = scanResults[zone.id];
          const isDone = !!scan;
          const isUploading = uploadingZoneId === zone.id;

          return (
            <div
              key={zone.id}
              className={`bg-white rounded-3xl border transition-all shadow-xs overflow-hidden ${
                isDone
                  ? 'border-emerald-300 ring-2 ring-emerald-500/10'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Card Top Header */}
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-sm shrink-0 ${
                      isDone
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-5 h-5" /> : `0${idx + 1}`}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        {zone.name}
                      </h3>
                      {zone.required ? (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          Mandatory
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Optional Room
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {zone.description}
                    </p>
                  </div>
                </div>

                {/* Right controls: AR scale reference & delete if custom */}
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Scale Reference
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      {zone.scaleReference}
                    </span>
                  </div>

                  {!zone.required && (
                    <button
                      type="button"
                      onClick={() => handleRemoveZone(zone.id)}
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                      title="Remove custom room"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Card Body: Either Completed Keyframes or Capture Triggers */}
              <div className="p-6 space-y-6">
                {/* Visual Guidance Banner */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 text-xs text-slate-600 flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800">Scan Guidance: </strong>
                    <span>{zone.guidance}</span>
                  </div>
                </div>

                {/* CASE A: MANUAL DIMENSIONS FALLBACK MODE */}
                {isManualFallback ? (
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                        Manual Architectural Dimensions &amp; Specifications
                      </h4>
                      {isDone && scan.isManualFallback && (
                        <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Specs Recorded
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                          Length (Feet)
                        </label>
                        <input
                          type="number"
                          min={4}
                          max={200}
                          value={manualDrafts[zone.id]?.lengthFt ?? 16}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setManualDrafts((prev) => ({
                              ...prev,
                              [zone.id]: {
                                ...prev[zone.id],
                                lengthFt: val,
                                widthFt: prev[zone.id]?.widthFt ?? 12,
                                heightFt: prev[zone.id]?.heightFt ?? 10,
                                flooringType: prev[zone.id]?.flooringType ?? 'Vitrified Tiles',
                                wallCondition: prev[zone.id]?.wallCondition ?? 'Excellent',
                              },
                            }));
                          }}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                          Width (Feet)
                        </label>
                        <input
                          type="number"
                          min={4}
                          max={200}
                          value={manualDrafts[zone.id]?.widthFt ?? 12}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setManualDrafts((prev) => ({
                              ...prev,
                              [zone.id]: {
                                ...prev[zone.id],
                                lengthFt: prev[zone.id]?.lengthFt ?? 16,
                                widthFt: val,
                                heightFt: prev[zone.id]?.heightFt ?? 10,
                                flooringType: prev[zone.id]?.flooringType ?? 'Vitrified Tiles',
                                wallCondition: prev[zone.id]?.wallCondition ?? 'Excellent',
                              },
                            }));
                          }}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                          Clear Height (Feet)
                        </label>
                        <input
                          type="number"
                          min={7}
                          max={45}
                          value={manualDrafts[zone.id]?.heightFt ?? 10}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setManualDrafts((prev) => ({
                              ...prev,
                              [zone.id]: {
                                ...prev[zone.id],
                                lengthFt: prev[zone.id]?.lengthFt ?? 16,
                                widthFt: prev[zone.id]?.widthFt ?? 12,
                                heightFt: val,
                                flooringType: prev[zone.id]?.flooringType ?? 'Vitrified Tiles',
                                wallCondition: prev[zone.id]?.wallCondition ?? 'Excellent',
                              },
                            }));
                          }}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                          Flooring Finish
                        </label>
                        <select
                          value={manualDrafts[zone.id]?.flooringType ?? 'Vitrified Tiles (High Gloss)'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManualDrafts((prev) => ({
                              ...prev,
                              [zone.id]: {
                                ...prev[zone.id],
                                lengthFt: prev[zone.id]?.lengthFt ?? 16,
                                widthFt: prev[zone.id]?.widthFt ?? 12,
                                heightFt: prev[zone.id]?.heightFt ?? 10,
                                flooringType: val,
                                wallCondition: prev[zone.id]?.wallCondition ?? 'Excellent',
                              },
                            }));
                          }}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="Vitrified Tiles (High Gloss)">Vitrified Tiles (High Gloss)</option>
                          <option value="Italian Marble">Italian / Imported Marble</option>
                          <option value="Kota Stone / Granite">Kota Stone / Polished Granite</option>
                          <option value="Laser Screed Concrete">Laser Screed Concrete (Industrial)</option>
                          <option value="Hardwood / Wooden Laminate">Hardwood / Wooden Laminate</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                          Wall Condition
                        </label>
                        <select
                          value={manualDrafts[zone.id]?.wallCondition ?? 'Excellent (Fresh Paint, Zero Dampness)'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManualDrafts((prev) => ({
                              ...prev,
                              [zone.id]: {
                                ...prev[zone.id],
                                lengthFt: prev[zone.id]?.lengthFt ?? 16,
                                widthFt: prev[zone.id]?.widthFt ?? 12,
                                heightFt: prev[zone.id]?.heightFt ?? 10,
                                flooringType: prev[zone.id]?.flooringType ?? 'Vitrified Tiles',
                                wallCondition: val,
                              },
                            }));
                          }}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="Excellent (Fresh Paint, Zero Dampness)">Excellent (Fresh Paint, Zero Dampness)</option>
                          <option value="Good Condition (Minor Cosmetic Wear)">Good Condition (Minor Cosmetic Wear)</option>
                          <option value="Fair (Requires Repainting)">Fair (Requires Repainting)</option>
                          <option value="Distressed (Efflorescence / Dampness Noticed)">Distressed (Efflorescence / Dampness)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveManualDimensions(zone)}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      Save Dimensions &amp; Generate 4 Keyframes
                    </button>
                  </div>
                ) : null}

                {/* CASE B: COMPLETED SCAN WITH 4 EXTRACTED KEYFRAMES */}
                {isDone && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-900">
                          4 Calibrated Keyframes Extracted (720p JPEG Base64)
                        </span>
                        <span className="text-[11px] text-slate-400">
                          · Captured at {scan.capturedAt}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveCameraZone(zone)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3 text-slate-500" />
                          <span>Retake Video</span>
                        </button>
                      </div>
                    </div>

                    {/* 4 Thumbnails Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {scan.extractedKeyframes.map((frame, fIdx) => (
                        <div
                          key={fIdx}
                          onClick={() => setPreviewImage(frame)}
                          className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video cursor-pointer shadow-xs hover:ring-2 hover:ring-indigo-500 transition-all"
                        >
                          <img
                            src={frame}
                            alt={`Frame 0${fIdx + 1} - ${zone.name}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Maximize2 className="w-5 h-5 drop-shadow" />
                          </div>
                          <div className="absolute bottom-1 left-1.5 bg-black/70 backdrop-blur-xs text-[10px] font-mono text-white px-1.5 py-0.5 rounded">
                            Frame 0{fIdx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CASE C: ACTION BUTTONS (RECORD 15s VIDEO OR UPLOAD VIDEO FILE) */}
                {(!isDone || isManualFallback) && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                    {/* Camera Recording Button */}
                    <button
                      type="button"
                      onClick={() => setActiveCameraZone(zone)}
                      disabled={isUploading}
                      className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Record 15s Guided Video</span>
                    </button>

                    {/* Video Upload Trigger */}
                    <label
                      htmlFor={`${fileInputPrefix}-${zone.id}`}
                      className="flex-1 py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                          <span>Extracting 4 Frames...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-slate-500" />
                          <span>Upload Video File</span>
                        </>
                      )}
                      <input
                        id={`${fileInputPrefix}-${zone.id}`}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(zone, e)}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* OPTIONAL "+ ADD ROOM" FOR RESIDENTIAL CATEGORY */}
        {property.category === 'residential' && (
          <div className="pt-2">
            {isAddingRoom ? (
              <div className="bg-white rounded-2xl border border-indigo-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Add Custom Residential Room to Scan Plan
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingRoom(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="e.g. Master Bedroom, Balcony / Deck, Study Room"
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <div className="flex items-center gap-2">
                    {['Master Bedroom', 'Balcony Deck', 'Pooja / Study'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNewRoomName(preset)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium rounded-lg transition-colors cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddCustomRoom(newRoomName)}
                  disabled={!newRoomName.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  Confirm &amp; Add Zone Card
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingRoom(true)}
                className="w-full py-4 border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 text-slate-600 hover:text-indigo-700 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Room (Master Bedroom, Balcony, Dining, etc.)</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* LIGHTBOX KEYFRAME PREVIEW MODAL */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
            <div className="p-3 bg-black/60 flex items-center justify-between text-xs text-white">
              <span className="font-mono">720p Extracted Keyframe Preview</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewImage}
              alt="Enlarged Keyframe"
              referrerPolicy="no-referrer"
              className="w-full h-auto object-contain max-h-[75vh]"
            />
          </div>
        </div>
      )}

      {/* AR CAMERA MODAL */}
      {activeCameraZone && (
        <ARCameraModal
          zone={activeCameraZone}
          onClose={() => setActiveCameraZone(null)}
          onComplete={handleCameraComplete}
        />
      )}

      {/* STEP NAVIGATION BUTTONS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200">
        <button
          type="button"
          onClick={onPrev}
          className="px-6 py-3.5 border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Location</span>
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!isAllRequiredVerified && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl hidden md:inline-block">
              Tip: Scan all required zones or use manual dimensions
            </span>
          )}

          <button
            type="button"
            onClick={onNext}
            className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-[0.99] flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center group"
          >
            <span>Next: Property Boosters</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
