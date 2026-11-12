import { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type ZoomableImageProps = {
  uri: string;
  height: number;
};

export default function ZoomableImage({
  uri,
  height,
}: ZoomableImageProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setIsOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Agrandir la photo"
        style={[styles.preview, { height }]}
      >
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode="contain"
        />
      </Pressable>

      <Modal
        visible={isOpen}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modal}>
          <Pressable
            onPress={() => setIsOpen(false)}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Fermer la photo agrandie"
          >
            <Text style={styles.closeText}>Fermer ✕</Text>
          </Pressable>

          <Pressable
            style={styles.fullImageArea}
            onPress={() => setIsOpen(false)}
          >
            <Image
              source={{ uri }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  preview: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: '#E5F0EC',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  modal: {
    flex: 1,
    backgroundColor: '#101412',
    paddingTop: 48,
    paddingBottom: 20,
  },
  closeButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  fullImageArea: {
    flex: 1,
    justifyContent: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
});