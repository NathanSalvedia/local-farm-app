import AsyncStorage from "@react-native-async-storage/async-storage";

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export interface RSBSAApplication {
  fullName: string;
  rsbsaNumber: string;
  farmName: string;
  location: string;
  crops: string;
  documentUri?: string;
  status: VerificationStatus;
  submittedAt?: string;
  verifiedAt?: string;
}

const RSBSA_STORAGE_KEY = "localfarm_rsbsa_verification_v1";

export const DEFAULT_RSBSA_STATE: RSBSAApplication = {
  fullName: "",
  rsbsaNumber: "",
  farmName: "",
  location: "",
  crops: "",
  status: "unverified",
};

export async function getRSBSAApplication(): Promise<RSBSAApplication> {
  try {
    const data = await AsyncStorage.getItem(RSBSA_STORAGE_KEY);
    if (data !== null) {
      return JSON.parse(data);
    }
    return DEFAULT_RSBSA_STATE;
  } catch (err) {
    console.warn("Failed to load RSBSA application:", err);
    return DEFAULT_RSBSA_STATE;
  }
}

export async function submitRSBSAApplication(
  data: Omit<RSBSAApplication, "status" | "submittedAt">
): Promise<RSBSAApplication> {
  try {
    const newApp: RSBSAApplication = {
      ...data,
      status: "pending",
      submittedAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };
    await AsyncStorage.setItem(RSBSA_STORAGE_KEY, JSON.stringify(newApp));
    return newApp;
  } catch (err) {
    console.warn("Failed to save RSBSA application:", err);
    return { ...DEFAULT_RSBSA_STATE, status: "pending" };
  }
}

export async function setRSBSAStatus(
  status: VerificationStatus
): Promise<RSBSAApplication> {
  try {
    const current = await getRSBSAApplication();
    const updated: RSBSAApplication = {
      ...current,
      status,
      verifiedAt:
        status === "verified"
          ? new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : undefined,
    };
    await AsyncStorage.setItem(RSBSA_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn("Failed to update RSBSA status:", err);
    return DEFAULT_RSBSA_STATE;
  }
}

export async function resetRSBSAApplication(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RSBSA_STORAGE_KEY);
  } catch (err) {
    console.warn("Failed to reset RSBSA application:", err);
  }
}
