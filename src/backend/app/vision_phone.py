from ultralytics import YOLO

# Accept a box as a phone only above this confidence. Raised to cut false
# positives. If real phones (especially landscape) get missed, lower toward
# 0.35–0.30 based on the debug logs below.
PHONE_CONFIDENCE = 0.45

# Floor passed to YOLO so near-threshold boxes are still returned and logged
# (the model's own default is 0.25). We make the accept/reject decision here.
MODEL_CONFIDENCE_FLOOR = 0.25

# Ignore boxes smaller than this fraction of the analysed region's area — very
# tiny boxes are usually noise. Kept modest (0.5%) so partially-visible phones
# still register, while the 0.45 confidence gate above (plus the engine's 3s
# continuous-detection requirement) keeps false positives in check. This is the
# safe lever for partial-phone recall; do NOT lower PHONE_CONFIDENCE instead.
MIN_BOX_AREA_FRAC = 0.005  # 0.5% of the frame/region

# Test-time augmentation: helps rotated / landscape phones but ~doubles
# inference time. Off by default for demo reliability; flip to True if you
# need the extra landscape robustness and have the CPU/GPU headroom.
AUGMENT = False

# Log class name, confidence, and bounding-box size for every candidate.
DEBUG = False


class PhoneDetector:
    def __init__(
        self,
        confidence=PHONE_CONFIDENCE,
        min_area_frac=MIN_BOX_AREA_FRAC,
        augment=AUGMENT,
        debug=DEBUG,
    ):
        self.model = YOLO("yolo11s.pt")
        self.phone_labels = {"cell phone", "mobile phone", "phone"}
        self.confidence_threshold = confidence
        self.min_area_frac = min_area_frac
        self.augment = augment
        self.debug = debug

    def reset(self):
        """Detection is per-frame; no session state to clear."""
        pass

    def _has_phone(self, frame, region="full"):
        region_h, region_w = frame.shape[:2]
        region_area = float(region_h * region_w)

        results = self.model(
            frame,
            conf=MODEL_CONFIDENCE_FLOOR,
            augment=self.augment,
            verbose=False,
        )

        detected = False
        for result in results:
            for box in result.boxes:
                class_id = int(box.cls[0])
                class_name = self.model.names[class_id]
                if class_name not in self.phone_labels:
                    continue

                confidence = float(box.conf[0])
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                width, height = x2 - x1, y2 - y1
                area_frac = (width * height) / region_area if region_area else 0.0
                orientation = "landscape" if width >= height else "portrait"

                # Reject low confidence and very small boxes. No aspect-ratio
                # filtering — both portrait and landscape boxes are accepted.
                big_enough = area_frac >= self.min_area_frac
                confident = confidence >= self.confidence_threshold
                accepted = confident and big_enough

                if self.debug:
                    print(
                        f"[phone] region={region} class={class_name} "
                        f"conf={confidence:.2f} box={width:.0f}x{height:.0f} "
                        f"({orientation}) area={area_frac * 100:.1f}% "
                        f"accepted={accepted}"
                    )

                if accepted:
                    detected = True

        return detected

    def detect(self, frame):
        # Per-frame decision only. Temporal stability (must persist >3s) and the
        # single-alert behaviour are enforced by FocusEngine (PHONE_THRESHOLD).
        if self._has_phone(frame, region="full"):
            return True

        # Lower part of the frame (phone on the desk / in the lap).
        height = frame.shape[0]
        bottom_part = frame[int(height * 0.45):, :]
        if self._has_phone(bottom_part, region="bottom"):
            return True

        return False
