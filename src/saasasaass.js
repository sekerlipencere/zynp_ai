import React, { useState, useEffect, useRef } from 'react';

const App = () => {
  const [currentState, setCurrentState] = useState('image1');
  const [studentId, setStudentId] = useState('');
  const [studentData, setStudentData] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const inputRef = useRef(null);

  // Herhangi bir tuşa basma kontrolü
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (currentState === 'image1') {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentState('image2');
          setIsTransitioning(false);
        }, 500);
      } else if (currentState === 'image2') {
        setCurrentState('form');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentState]);

  // Form ekranına geçildiğinde input'a odaklan
  useEffect(() => {
    if (currentState === 'form' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentState]);

  // G tuşu kontrolü
  useEffect(() => {
    const handleGKeyPress = (e) => {
      if ((e.key === 'g' || e.key === 'G') && currentState === 'form') {
        handleSubmit(e);
      }
    };

    window.addEventListener('keydown', handleGKeyPress);
    return () => window.removeEventListener('keydown', handleGKeyPress);
  }, [currentState, studentId]);

  // Webcam başlatma
  useEffect(() => {
    if (currentState === 'webcam') {
      startWebcam();
    }
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [currentState]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
    }
  };

  const validateStudentId = (id) => {
    if (id.length === 0) {
      setError('Okul numarası gereklidir');
      return false;
    }
    if (id.length > 4) {
      setError('Okul numarası maksimum 4 karakter olmalıdır');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStudentId(studentId)) {
      return;
    }

    try {
      setError('');
      const response = await fetch(`http://localhost:3131/api/students/${studentId}`);
      if (!response.ok) {
        throw new Error('API yanıt vermedi');
      }
      const result = await response.json();
      if (result.success && result.data) {
        setStudentData(result.data);
        setCurrentState('webcam');
      } else {
        setError('Öğrenci bulunamadı');
      }
    } catch (error) {
      console.error("Error fetching student data:", error);
      setError('Veri alınırken bir hata oluştu');
    }
  };

  const handleStudentIdChange = (e) => {
    const value = e.target.value;
    // Sadece rakam ve maksimum 4 karakter
    if (/^\d{0,4}$/.test(value)) {
      setStudentId(value);
      setError('');
    }
  };

  return (
      <div className="w-full h-screen bg-black overflow-hidden">
        {currentState === 'image1' && (
            <img
                src="images/1.png"
                alt="Image 1"
                className={`w-full h-full object-cover ${isTransitioning ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}
            />
        )}

        {currentState === 'image2' && (
            <img
                src="images/2.png"
                alt="Image 2"
                className="w-full h-full object-cover animate-fade-in"
            />
        )}

        {currentState === 'form' && (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600">
              <div className="bg-white p-12 rounded-xl shadow-2xl max-w-2xl w-full mx-6">
                <form
                    onSubmit={handleSubmit}
                    className="space-y-8"
                >
                  <div className="space-y-4">
                    <h2 className="text-4xl font-bold text-center text-gray-800 mb-8">
                      Öğrenci Numarası Girin
                    </h2>
                    <input
                        ref={inputRef}
                        type="text"
                        value={studentId}
                        onChange={handleStudentIdChange}
                        className={`w-full px-6 py-4 text-3xl border rounded-lg focus:outline-none focus:ring-4 text-center tracking-wider ${
                            error ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-200'
                        }`}
                        placeholder="####"
                        required
                        minLength="1"
                        maxLength="4"
                    />
                    {error && (
                        <p className="text-red-500 text-lg text-center font-medium mt-2">{error}</p>
                    )}
                    <p className="text-lg text-gray-600 text-center mt-4">
                      G tuşuna basarak veya butona tıklayarak gönderebilirsiniz
                    </p>
                  </div>
                  <button
                      type="submit"
                      className="w-full py-4 px-6 text-xl bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-300 font-semibold"
                  >
                    Gönder (G)
                  </button>
                </form>
              </div>
            </div>
        )}

        {currentState === 'webcam' && (
            <div className="w-full h-full relative">
              <img
                  src="images/3.png"
                  alt="Image 3"
                  className="w-full h-full object-cover absolute top-0 left-0"
              />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] bg-black rounded-lg overflow-hidden shadow-2xl">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />
              </div>
              {studentData && (
                  <div className="absolute top-8 right-8 bg-white p-8 rounded-xl shadow-2xl max-w-md">
                    <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">
                      Öğrenci Bilgileri
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500">Okul Numarası</p>
                        <p className="text-xl font-semibold">{studentData.okul_no}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Ad</p>
                        <p className="text-xl font-semibold">{studentData.ad}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Soyad</p>
                        <p className="text-xl font-semibold">{studentData.soyad}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Sınıf</p>
                        <p className="text-xl font-semibold">{studentData.sinif}</p>
                      </div>
                    </div>
                  </div>
              )}
            </div>
        )}
      </div>
  );
};

export default App;