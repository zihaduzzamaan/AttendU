import numpy as np
import cv2

class ImageEnhancer:
    def __init__(self):
        pass

    def single_scale_retinex(self, img, sigma):
        retinex = np.log10(img) - np.log10(cv2.GaussianBlur(img, (0, 0), sigma))
        return retinex

    def multi_scale_retinex(self, img, scales=[15, 80, 250]):
        retinex = np.zeros_like(img)
        for sigma in scales:
            retinex += self.single_scale_retinex(img, sigma)
        return retinex / len(scales)

    def color_restoration(self, img, alpha, beta):
        img_sum = np.sum(img, axis=2, keepdims=True)
        color_restoration = beta * (np.log10(alpha * img) - np.log10(img_sum))
        return color_restoration

    def automated_msrcr(self, img, scales=[15, 80, 250]):
        """
        Automated Multi-Scale Retinex with Color Restoration (MSRCR)
        """
        img = img.astype(np.float64) + 1.0
        msr = self.multi_scale_retinex(img, scales)
        
        # Color restoration
        # cr = self.color_restoration(img, 125, 46) 
        # Simplified MSRCR often skips complex CR parameters or just uses MSR for structure
        # Let's use a simpler MSR approach for face detection consistency unless CR is strictly needed for color fidelity.
        # Ideally for face rec, local contrast enhancement fits better.
        
        # Normalization
        msr_norm = (msr - np.min(msr)) / (np.max(msr) - np.min(msr)) * 255
        msr_norm = np.uint8(msr_norm)
        
        return msr_norm

    def apply_retinex(self, image_np):
        """
        Apply Retinex enhancement to a BGR image.
        """
        # Split channels
        b, g, r = cv2.split(image_np)
        
        # Apply MSR to each channel
        b_retinex = self.automated_msrcr(b)
        g_retinex = self.automated_msrcr(g)
        r_retinex = self.automated_msrcr(r)
        
        # Merge back
        enhanced_img = cv2.merge((b_retinex, g_retinex, r_retinex))
        
        # Optional: slight gamma correction or histogram equalization could be added here
        # but Retinex usually handles dynamic range well.
        
        return enhanced_img

    def enhance_if_needed(self, image_np, brightness_threshold=40):
        """
        Check image brightness and apply enhancement if it's too dark.
        Optimized: Uses simple Gamma correction instead of Retinex for speed.
        """
        # Convert to HSV to check brightness (Value channel)
        hsv = cv2.cvtColor(image_np, cv2.COLOR_BGR2HSV)
        v_channel = hsv[:, :, 2]
        avg_brightness = np.mean(v_channel)
        
        # Only enhance if extremely dark to save 200-300ms
        if avg_brightness < brightness_threshold:
            print(f"🔦 Low light detected ({avg_brightness:.2f}). Applying Gamma Correction...")
            # Simple Gamma Correction (Fast)
            gamma = 1.5
            invGamma = 1.0 / gamma
            table = np.array([((i / 255.0) ** invGamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
            return cv2.LUT(image_np, table)
        
        return image_np

enhancer = ImageEnhancer()
