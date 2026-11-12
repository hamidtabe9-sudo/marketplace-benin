import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';

const brandColor = '#176B5B';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: brandColor,
        tabBarInactiveTintColor: '#7A8580',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarStyle: {
          height: 64,
          paddingTop: 6,
          paddingBottom: 6,
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E8ECE9',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: 'house.fill', android: 'home', web: 'home' }}
              tintColor={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="rechercher"
        options={{
          title: 'Rechercher',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{
                ios: 'magnifyingglass',
                android: 'search',
                web: 'search',
              }}
              tintColor={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
  name="mes-publications"
  options={{
    title: 'Mes publications',
    tabBarIcon: ({ color, size }) => (
      <SymbolView
        name={{
          ios: 'square.stack.3d.up',
          android: 'list',
          web: 'list',
        }}
        tintColor={color}
        size={size}
      />
    ),
  }}
/>
<Tabs.Screen
  name="messages"
  options={{
    title: 'Messages',
    tabBarIcon: ({ color, size }) => (
      <SymbolView
        name={{
          ios: 'bubble.left.and.bubble.right.fill',
          android: 'chat',
          web: 'chat',
        }}
        tintColor={color}
        size={size}
      />
    ),
  }}
/>

      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{
                ios: 'person.crop.circle',
                android: 'person',
                web: 'person',
              }}
              tintColor={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}