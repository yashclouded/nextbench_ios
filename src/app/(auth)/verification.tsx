import { updateDocument } from '@/services/firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { uploadToCloudinary } from '@/lib/storage';
import { useAuth } from '@/providers/AuthProvider';
import { ArrowRight, Camera, CheckCircle, CreditCard, ShieldCheck } from 'lucide-react-native';

export default function VerificationScreen() {
  const { user, userData } = useAuth();

  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);

  const [idUri, setIdUri] = useState<string | null>(null);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);

  // If already verified, kick to home page back 
  useEffect(() => {
    if (userData?.verified) {
      router.replace('/(tabs)');
      return;
    }
    // If pending, jump to step 3
    if (userData?.verificationStatus === 'pending' && userData?.idCardUrl) {
      setStep(3);
    }
  }, [userData]);

  const takeIdPhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      alert("You need to grant camera permissions to verify your ID.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setIdUri(result.assets[0].uri);
    }
  };

  const takeSelfie = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      alert("You need to grant camera permissions to take a selfie.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
      cameraType: ImagePicker.CameraType.front,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelfieUri(result.assets[0].uri);
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!idUri) {
        alert("Please take a photo of your ID to continue.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!selfieUri || !idUri || !user) {
        alert("Please take a selfie to continue.");
        return;
      }

      setIsUploading(true);
      try {
        const idUrl = await uploadToCloudinary(idUri, 'nextbench/ids');
        const selfieUrl = await uploadToCloudinary(selfieUri, 'nextbench/ids');

        await updateDocument('users', user.uid, {
          idCardUrl: idUrl,
          selfieUrl: selfieUrl,
          verificationStatus: 'pending',
        });

        setStep(3);
      } catch (error) {
        console.error("Upload error:", error);
        alert("Failed to upload images. Please try again.");
      } finally {
        setIsUploading(false);
      }
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-base">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} className="flex-1">

        {/* Progress Bar */}
        <View className="flex-row items-center gap-2 mb-10 mt-4">
          {[1, 2, 3].map((s) => (
            <View key={s} className="flex-1 h-1.5 rounded-full bg-surface-soft overflow-hidden">
              <View
                className={`h-full ${step >= s ? 'bg-brand-teal' : 'bg-transparent'}`}
              />
            </View>
          ))}
        </View>

        <View className="bg-surface-card rounded-[2rem] p-6 border border-brand-teal/10 shadow-sm">

          {step === 1 && (
            <View className="items-center">
              <View className="w-16 h-16 bg-brand-teal/10 rounded-2xl items-center justify-center mb-6">
                <CreditCard color="#00C4B5" size={32} />
              </View>
              <Text variant="h2" className="text-center mb-4">School ID Verification</Text>
              <Text variant="body" className="text-content-secondary text-center mb-8">
                Take a clear photo of your official student ID card. Ensure your name and photo are clearly visible.
              </Text>

              <TouchableOpacity
                onPress={takeIdPhoto}
                activeOpacity={0.8}
                className="w-full aspect-video border-2 border-dashed border-brand-teal/30 rounded-[1.5rem] bg-brand-teal/5 items-center justify-center overflow-hidden mb-8"
              >
                {idUri ? (
                  <>
                    <Image source={{ uri: idUri }} className="w-full h-full opacity-60" />
                    <View className="absolute inset-0 items-center justify-center bg-black/20">
                      <View className="bg-white/90 px-4 py-2 rounded-full">
                        <Text variant="label" className="text-brand-teal uppercase font-bold tracking-widest text-[10px]">Retake Photo</Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <View className="items-center">
                    <Camera color="#00C4B5" size={40} opacity={0.5} />
                    <Text variant="label" className="text-brand-teal/50 mt-3 uppercase tracking-widest text-[10px] font-bold">Tap to Open Camera</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View className="flex-row items-start bg-surface-soft p-4 rounded-xl mb-4">
                <ShieldCheck color="#00C4B5" size={20} className="mr-3 mt-0.5" />
                <Text variant="caption" className="text-content-secondary leading-tight flex-1">
                  Your ID is used only for verification and is stored securely. We never share it with anyone.
                </Text>
              </View>
            </View>
          )}

          {step === 2 && (
            <View className="items-center">
              <View className="w-16 h-16 bg-brand-pink-soft/10 rounded-2xl items-center justify-center mb-6">
                <Camera color="#F77CA2" size={32} />
              </View>
              <Text variant="h2" className="text-center mb-4">Live Selfie Check</Text>
              <Text variant="body" className="text-content-secondary text-center mb-8">
                We need a quick selfie of you to match identity with your ID card. Smile — you're almost in.
              </Text>

              <TouchableOpacity
                onPress={takeSelfie}
                activeOpacity={0.8}
                className="w-48 h-48 border-2 border-dashed border-brand-pink-soft/40 rounded-full bg-brand-pink-soft/5 items-center justify-center overflow-hidden mb-8"
              >
                {selfieUri ? (
                  <>
                    <Image source={{ uri: selfieUri }} className="w-full h-full" />
                    <View className="absolute inset-0 items-center justify-center bg-black/40">
                      <Text variant="label" className="text-white uppercase font-bold tracking-widest text-[10px]">Retake</Text>
                    </View>
                  </>
                ) : (
                  <View className="items-center">
                    <Camera color="#F77CA2" size={40} opacity={0.5} />
                    <Text variant="label" className="text-brand-pink-soft/50 mt-3 uppercase tracking-widest text-[10px] font-bold">Take Selfie</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {step === 3 && (
            <View className="items-center py-6">
              <View className="w-20 h-20 bg-brand-teal rounded-full items-center justify-center mb-6 shadow-sm shadow-brand-teal/40">
                <CheckCircle color="white" size={40} />
              </View>
              <Text variant="h2" className="text-center mb-4">Submission Complete</Text>
              <Text variant="body" className="text-content-secondary text-center mb-8">
                Your credentials have been submitted for manual approval. This usually takes 2-4 hours during business days.
              </Text>

              <View className="bg-brand-teal/10 px-6 py-4 rounded-2xl items-center mb-4">
                <View className="flex-row items-center mb-1">
                  <ShieldCheck color="#00C4B5" size={16} className="mr-2" />
                  <Text variant="label" className="text-brand-teal uppercase font-bold tracking-widest text-[11px]">Application Pending</Text>
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={handleNext}
            disabled={isUploading}
            activeOpacity={0.8}
            className={`w-full py-4 rounded-full flex-row items-center justify-center mt-6 ${isUploading ? 'bg-content-tertiary' : 'bg-content'}`}
          >
            {isUploading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text variant="button" className="text-surface-base">
                  {step === 3 ? 'Go to Home Feed' : 'Confirm & Continue'}
                </Text>
                {step < 3 && <ArrowRight color="white" size={20} className="ml-2" />}
              </>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
