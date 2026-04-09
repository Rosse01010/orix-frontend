import type { ConfidenceTier } from "./Socket";

/**
 * A person that the backend considers a possible match
 * for an unidentified or off-angle face.
 *
 * similarity is ArcFace cosine similarity ∈ [0, 1].
 * Interpretation (Deng et al., CVPR 2019):
 *   ≥ 0.55  → high confidence (positive pair cluster)
 *   0.40–0.54 → moderate (overlap region between positive/negative)
 *   0.30–0.39 → weak (border of negative pair distribution)
 *   < 0.30   → noise floor, should not appear (filtered by backend)
 */
export interface CandidateMatch {
  person_id: string;
  name: string;
  /** ArcFace cosine similarity ∈ [0.30, 1.00] */
  similarity: number;
}

/**
 * One entry in the similarity panel.
 * Represents an unidentified or uncertain face with its top candidate matches.
 */
export interface FaceCandidate {
  /** Index matching bboxes[face_index] in the detection event */
  face_index: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
    name: string;
    confidence: number;
    /** ArcFace-derived confidence tier */
    confidence_tier?: ConfidenceTier;
    angle: string;
  };
  /** True when no person exceeded the similarity threshold */
  is_unknown: boolean;
  /**
   * "moderate" when a match was found but similarity is in the 0.40–0.54
   * overlap zone (VGGFace2 shows this is common for off-axis/age-gap faces)
   */
  confidence_tier?: ConfidenceTier;
  /** Yaw angle in degrees — positive = left profile, negative = right */
  yaw: number;
  top_matches: CandidateMatch[];
  cameraId: string;
  /** Original 512-dim ArcFace embedding for operator confirmation */
  embedding?: number[];
  timestamp: string;
}
