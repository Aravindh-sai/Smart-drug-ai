import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { auth, db, storage } from "../lib/firebaseConfig";
import { doc, getDoc, setDoc, collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { extractTextFromFile } from "../utils/textExtraction";
import styles from "../styles/HealthAnalysis.module.css";

export default function HealthAnalysis() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [formData, setFormData] = useState({
    age: "",
    height: "",
    weight: "",
    activityLevel: "Sedentary",
  });
  const [medicalFiles, setMedicalFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [extractedMetrics, setExtractedMetrics] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserName(userDoc.data().name);
        } else {
          setError("User data not found. Please try logging in again.");
          router.replace("/login");
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Error loading user data. Please try again.");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('Uploading file...');
    setFormData(prev => ({ ...prev, medicalReport: file }));

    try {
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);

      await new Promise(resolve => setTimeout(resolve, 2000));
      clearInterval(interval);
      setUploadProgress(100);
      setUploadStatus('File uploaded successfully!');
    } catch (error) {
      setUploadStatus('Error uploading file. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess(false);
    setExtractedMetrics(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No user logged in");

      const aggregatedMetrics = {
        bp_systolic: null,
        bp_diastolic: null,
        diabetes: null,
        cholesterol: null,
        thyroid: null
      };

      const healthAnalysisRef = doc(db, "health-analysis", user.uid);
      const medicalReportsRef = collection(healthAnalysisRef, "medicalReports");

      await Promise.all(
        medicalFiles.map(async (file) => {
          try {
            const { text: extractedText, metrics } = await extractTextFromFile(file);

            if (aggregatedMetrics.bp_systolic === null && metrics.bp_systolic !== null) {
              aggregatedMetrics.bp_systolic = metrics.bp_systolic;
            }
            if (aggregatedMetrics.bp_diastolic === null && metrics.bp_diastolic !== null) {
              aggregatedMetrics.bp_diastolic = metrics.bp_diastolic;
            }
            if (aggregatedMetrics.diabetes === null && metrics.diabetes !== null) {
              aggregatedMetrics.diabetes = metrics.diabetes;
            }
            if (aggregatedMetrics.cholesterol === null && metrics.cholesterol !== null) {
              aggregatedMetrics.cholesterol = metrics.cholesterol;
            }
            if (aggregatedMetrics.thyroid === null && metrics.thyroid !== null) {
              aggregatedMetrics.thyroid = metrics.thyroid;
            }

            const storageRef = ref(storage, `medical-reports/${user.uid}/${file.name}`);
            await uploadBytes(storageRef, file);
            const fileUrl = await getDownloadURL(storageRef);

            await addDoc(medicalReportsRef, {
              fileName: file.name,
              fileUrl: fileUrl,
              uploadedAt: new Date().toISOString(),
              analyzedAt: new Date().toISOString(),
              extractedText: extractedText,
              bp_systolic: metrics.bp_systolic,
              bp_diastolic: metrics.bp_diastolic,
              diabetes: metrics.diabetes,
              cholesterol: metrics.cholesterol,
              thyroid: metrics.thyroid
            });
          } catch (err) {
            console.error(`Error processing file ${file.name}:`, err);
          }
        })
      );

      await setDoc(healthAnalysisRef, {
        ...formData,
        submittedAt: new Date().toISOString(),
        status: "pending",
        bp_systolic: aggregatedMetrics.bp_systolic,
        bp_diastolic: aggregatedMetrics.bp_diastolic,
        diabetes: aggregatedMetrics.diabetes,
        cholesterol: aggregatedMetrics.cholesterol,
        thyroid: aggregatedMetrics.thyroid
      });

      setSuccess(true);
      setExtractedMetrics(aggregatedMetrics);

      setTimeout(() => {
        router.replace("/home");
      }, 2000);

    } catch (err) {
      setError("Error submitting health analysis. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Health Analysis</h1>
        <p className={styles.welcomeText}>Welcome, {userName}</p>

        {error && <p className={styles.errorMessage}>{error}</p>}

        {!success ? (
          <form onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <input
                type="number"
                name="age"
                placeholder="Age"
                value={formData.age}
                onChange={handleInputChange}
                className={styles.input}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <input
                type="number"
                name="height"
                placeholder="Height (cm)"
                value={formData.height}
                onChange={handleInputChange}
                className={styles.input}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <input
                type="number"
                name="weight"
                placeholder="Weight (kg)"
                value={formData.weight}
                onChange={handleInputChange}
                className={styles.input}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <select
                name="activityLevel"
                value={formData.activityLevel}
                onChange={handleInputChange}
                className={styles.input}
                required
              >
                <option value="Sedentary">Sedentary</option>
                <option value="Lightly Active">Lightly Active</option>
                <option value="Moderately Active">Moderately Active</option>
                <option value="Very Active">Very Active</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="medicalReport">Upload Medical Report (PDF/Image)</label>
              <input
                type="file"
                id="medicalReport"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className={styles.formControl}
              />
              {uploading && (
                <div className={styles.uploadProgress}>
                  <p className={styles.statusMessage}>{uploadStatus}</p>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill} 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              {!uploading && uploadStatus && (
                <p className={styles.statusMessage}>{uploadStatus}</p>
              )}
              {formData.medicalReport && (
                <p className={styles.fileName}>
                  Selected file: {formData.medicalReport.name}
                </p>
              )}
            </div>

            <button 
              type="submit" 
              className={styles.button}
              disabled={isLoading}
            >
              {isLoading ? "Submitting..." : "Submit Analysis"}
            </button>
          </form>
        ) : (
          <div className={styles.successSection}>
            <h2 className={styles.subtitle}>Analysis Complete</h2>
            <div className={styles.metricsDisplay}>
              {extractedMetrics && (
                <>
                  {extractedMetrics.bp_systolic !== null && extractedMetrics.bp_diastolic !== null && (
                    <div className={styles.metricItem}>
                      <span className={styles.metricLabel}>Blood Pressure:</span>
                      <span className={styles.metricValue}>{extractedMetrics.bp_systolic}/{extractedMetrics.bp_diastolic} mmHg</span>
                    </div>
                  )}
                  {extractedMetrics.diabetes !== null && (
                    <div className={styles.metricItem}>
                      <span className={styles.metricLabel}>Blood Glucose:</span>
                      <span className={styles.metricValue}>{extractedMetrics.diabetes} mg/dL</span>
                    </div>
                  )}
                  {extractedMetrics.cholesterol !== null && (
                    <div className={styles.metricItem}>
                      <span className={styles.metricLabel}>Cholesterol:</span>
                      <span className={styles.metricValue}>{extractedMetrics.cholesterol} mg/dL</span>
                    </div>
                  )}
                  {extractedMetrics.thyroid !== null && (
                    <div className={styles.metricItem}>
                      <span className={styles.metricLabel}>TSH:</span>
                      <span className={styles.metricValue}>{extractedMetrics.thyroid} mIU/L</span>
                    </div>
                  )}
                </>
              )}
            </div>
            <p className={styles.redirectMessage}>Redirecting to home page...</p>
          </div>
        )}
      </div>
    </div>
  );
} 