import React, { useState, useEffect, useRef } from 'react';
import Anthropic from "@anthropic-ai/sdk";
import ReactMarkdown from 'react-markdown';

// Loglama yardımcı fonksiyonları
const logger = {
  info: (message, data = null) => {
    const timestamp = new Date().toISOString();
    const logMessage = {
      timestamp,
      level: 'INFO',
      message,
      data
    };
    console.log('%c[INFO]', 'color: #2196F3', JSON.stringify(logMessage, null, 2));
  },

  error: (message, error = null) => {
    const timestamp = new Date().toISOString();
    const logMessage = {
      timestamp,
      level: 'ERROR',
      message,
      error: error?.toString(),
      stack: error?.stack
    };
    console.error('%c[ERROR]', 'color: #f44336', JSON.stringify(logMessage, null, 2));
  },

  warn: (message, data = null) => {
    const timestamp = new Date().toISOString();
    const logMessage = {
      timestamp,
      level: 'WARN',
      message,
      data
    };
    console.warn('%c[WARN]', 'color: #ff9800', JSON.stringify(logMessage, null, 2));
  },

  state: (stateName, value) => {
    const timestamp = new Date().toISOString();
    const logMessage = {
      timestamp,
      level: 'STATE',
      stateName,
      value
    };
    console.log('%c[STATE]', 'color: #4CAF50', JSON.stringify(logMessage, null, 2));
  }
};

const App = () => {
  const [currentState, setCurrentState] = useState('image1');
  const [studentId, setStudentId] = useState('');
  const [studentData, setStudentData] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [showThanks, setShowThanks] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const videoRef = useRef(null);
  const loadingVideoRef = useRef(null);
  const inputRef = useRef(null);

  // State değişikliklerini izleme
  useEffect(() => {
    logger.state('currentState', currentState);
  }, [currentState]);

  useEffect(() => {
    logger.state('studentData', studentData);
  }, [studentData]);

  useEffect(() => {
    logger.state('error', error);
  }, [error]);

  useEffect(() => {
    logger.state('isAnalyzing', isAnalyzing);
  }, [isAnalyzing]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      logger.info('Tuş basıldı', { key: e.key, currentState });

      if (e.key === 'g' || e.key === 'G') {
        if (currentState === 'image1') {
          logger.info('image1 -> image2 geçişi başlatıldı');
          setIsTransitioning(true);
          setTimeout(() => {
            setCurrentState('image2');
            setIsTransitioning(false);
          }, 500);
        }
        else if (currentState === 'image2') {
          logger.info('image2 -> form geçişi');
          setCurrentState('form');
        }
        else if (currentState === 'form') {
          logger.info('Form gönderimi başlatıldı');
          handleSubmit(e);
        }
        else if (currentState === 'webcam' && !isAnalyzing && !showFullScreen) {
          logger.info('Webcam görüntü yakalama başlatıldı');
          captureAndAnalyze();
        }
        else if (showFullScreen) {
          logger.info('Uygulama sıfırlama başlatıldı');
          resetApplication();
        }
      } else if ((e.key === 'j' || e.key === 'J') && showFullScreen && !isAnalyzing) {
        logger.info('Yeniden analiz başlatıldı');
        reanalyzeImage();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentState, studentId, showFullScreen, isAnalyzing, capturedImage]);

  useEffect(() => {
    if (currentState === 'form' && inputRef.current) {
      logger.info('Form input focus');
      inputRef.current.focus();
    }
  }, [currentState]);

  useEffect(() => {
    if (currentState === 'webcam' && !showFullScreen && !showThanks) {
      logger.info('Webcam başlatılıyor');
      startWebcam();
    }
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        logger.info('Webcam kapatılıyor');
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [currentState, showFullScreen, showThanks]);

  useEffect(() => {
    if (aiResponse) {
      logger.info('AI yanıtı alındı, tam ekran gösterimi');
      setShowFullScreen(true);
    }
  }, [aiResponse]);

  const resetApplication = () => {
    logger.info('Uygulama sıfırlama başladı');
    setShowThanks(true);
    setCapturedImage(null);

    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }

    setTimeout(() => {
      logger.info('Uygulama sıfırlama tamamlandı');
      setShowThanks(false);
      setShowFullScreen(false);
      setAiResponse('');
      setStudentData(null);
      setStudentId('');
      setCurrentState('image1');
      setIsAnalyzing(false);
      setError('');
      setIsTransitioning(false);
    }, 3000);
  };

  const reanalyzeImage = async () => {
    if (!capturedImage) {
      logger.error('Yeniden analiz için görüntü bulunamadı');
      return;
    }

    logger.info('Yeniden analiz başlatıldı');
    setIsAnalyzing(true);
    setShowFullScreen(false);

    try {
      const anthropic = new Anthropic({
        apiKey: "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",
        dangerouslyAllowBrowser: true
      });

      logger.info('Claude API isteği gönderiliyor');
      const msg = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 8192,
        temperature: 0,
        system: "Türkçe anlat. Markdown formatında cevap ver.",
        messages: [
          {
            "role": "user",
            "content": [
              {
                "type": "image",
                "source": {
                  "type": "base64",
                  "media_type": "image/jpeg",
                  "data": capturedImage
                }
              },
              {
                "type": "text",
                "text": "Analiz et"
              }
            ]
          }
        ]
      });

      logger.info('Claude API yanıtı alındı');
      setAiResponse(msg.content[0].text);
    } catch (error) {
      logger.error('Claude API hatası:', error);
      setError('AI analiz sırasında bir hata oluştu');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !videoRef.current.videoWidth) {
      logger.error('Video referansı hazır değil');
      return;
    }

    logger.info('Görüntü yakalama başladı');
    setIsAnalyzing(true);
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);

    const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];
    setCapturedImage(base64Image);
    logger.info('Görüntü yakalandı ve base64\'e çevrildi');

    try {
      const anthropic = new Anthropic({
        apiKey: "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",
        dangerouslyAllowBrowser: true
      });

      logger.info('Claude API analiz isteği gönderiliyor');
      const msg = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 8192,
        temperature: 0,
        system: "Türkçe anlat. Markdown formatında cevap ver.",
        messages: [
          {
            "role": "user",
            "content": [
              {
                "type": "image",
                "source": {
                  "type": "base64",
                  "media_type": "image/jpeg",
                  "data": base64Image
                }
              },
              {
                "type": "text",
                "text": "Analiz et"
              }
            ]
          }
        ]
      });

      logger.info('Claude API yanıtı alındı');
      setAiResponse(msg.content[0].text);
    } catch (error) {
      logger.error('Claude API hatası:', error);
      setError('AI analiz sırasında bir hata oluştu');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startWebcam = async () => {
    try {
      logger.info('Webcam erişimi isteniyor');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        logger.info('Webcam başarıyla başlatıldı');
      }
    } catch (err) {
      logger.error('Webcam erişim hatası:', err);
    }
  };

  const validateStudentId = (id) => {
    logger.info('Öğrenci ID doğrulaması', { id });

    if (id.length === 0) {
      logger.warn('Boş öğrenci ID');
      setError('Okul numarası gereklidir');
      return false;
    }
    if (id.length > 4) {
      logger.warn('Geçersiz öğrenci ID uzunluğu');
      setError('Okul numarası maksimum 4 karakter olmalıdır');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    logger.info('Form gönderimi başladı', { studentId });

    if (!validateStudentId(studentId)) {
      return;
    }

    try {
      setError('');
      logger.info('Öğrenci verisi API isteği gönderiliyor');
      const response = await fetch(`http://localhost:3131/api/students/${studentId}`);
      if (!response.ok) {
        throw new Error('API yanıt vermedi');
      }
      const result = await response.json();
      if (result.success && result.data) {
        logger.info('Öğrenci verisi başarıyla alındı');
        setStudentData(result.data);
        setCurrentState('webcam');
      } else {
        logger.warn('Öğrenci bulunamadı');
        setError('Öğrenci bulunamadı');
      }
    } catch (error) {
      logger.error('Öğrenci verisi alma hatası:', error);
      setError('Veri alınırken bir hata oluştu');
    }
  };

  const handleStudentIdChange = (e) => {
    const value = e.target.value;
    if (/^\d{0,4}$/.test(value)) {
      logger.info('Öğrenci ID değişikliği', { value });
      setStudentId(value);
      setError('');
    }
  };

  if (showThanks) {
    return (
        <div className="fixed inset-0 bg-black flex items-center justify-center">
          <img
              src="images/tsk.png"
              alt="Teşekkürler"
              className="max-w-full max-h-full object-contain"
          />
        </div>
    );
  }

  if (showFullScreen && aiResponse) {
    return (
        <div className="fixed inset-0 bg-white z-50 overflow-auto p-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold">AI Analiz Sonucu</h1>
              <div className="text-gray-600">
                Çıkmak için G tuşuna basın | Tekrar analiz için J tuşuna basın
              </div>
            </div>
            <div className="prose prose-lg max-w-none">
              <ReactMarkdown>{aiResponse}</ReactMarkdown>
            </div>
          </div>
        </div>
    );
  }

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
                <form onSubmit={handleSubmit} className="space-y-8">
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
                        onFocus={() => logger.info('Öğrenci ID input focus')}
                        onBlur={() => logger.info('Öğrenci ID input blur')}
                    />
                    {error && (
                        <p className="text-red-500 text-lg text-center font-medium mt-2">{error}</p>
                    )}
                    <p className="text-lg text-gray-600 text-center mt-4">
                      G tuşuna basarak devam edin
                    </p>
                  </div>
                </form>
              </div>
            </div>
        )}

        {currentState === 'webcam' && !showFullScreen && (
            <div className="w-full h-full relative">
              <img
                  src="images/3.png"
                  alt="Image 3"
                  className="w-full h-full object-cover absolute top-0 left-0"
                  onLoad={() => logger.info('Arka plan görüntüsü yüklendi')}
              />

              {isAnalyzing ? (
                  <div className="absolute inset-0 bg-black">
                    <video
                        ref={loadingVideoRef}
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        src="videos/sa.mp4"
                        onLoadedData={() => logger.info('Yükleme videosu başlatıldı')}
                        onError={(e) => logger.error('Yükleme videosu hatası:', e)}
                    />
                    <div className="absolute bottom-8 left-8 right-8 text-white text-center text-2xl">
                      Görüntü analiz ediliyor...
                    </div>
                  </div>
              ) : (
                  <>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] bg-black rounded-lg overflow-hidden shadow-2xl">
                      <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover"
                          onLoadedData={() => logger.info('Webcam video akışı başladı')}
                          onError={(e) => logger.error('Webcam video akışı hatası:', e)}
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
                  </>
              )}
            </div>
        )}
      </div>
  );
};

// Performance monitoring için timing logları
if (process.env.NODE_ENV === 'development') {
  const originalSetState = React.useState;
  React.useState = function (...args) {
    const startTime = performance.now();
    const [state, setState] = originalSetState.apply(this, args);

    const wrappedSetState = (...setStateArgs) => {
      const setStartTime = performance.now();
      setState(...setStateArgs);
      logger.info(`setState Performance`, {
        executionTime: performance.now() - setStartTime,
        args: setStateArgs
      });
    };

    logger.info(`useState Performance`, {
      executionTime: performance.now() - startTime,
      initialState: args[0]
    });

    return [state, wrappedSetState];
  };
}

export default App;