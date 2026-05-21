import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useRef } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';

const { width } = Dimensions.get('window');

// ── Type colour map ──────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  fire: '#FF5A1F',
  water: '#3B9EFF',
  grass: '#4CAF50',
  electric: '#FFD600',
  psychic: '#FF4081',
  ice: '#74D7ED',
  dragon: '#7038F8',
  dark: '#705848',
  fairy: '#EE99AC',
  fighting: '#C03028',
  poison: '#A040A0',
  ground: '#E0C068',
  rock: '#B8A038',
  bug: '#A8B820',
  ghost: '#705898',
  steel: '#B8B8D0',
  normal: '#A8A878',
  flying: '#A890F0',
};

type Pokemon = { name: string; image: string };
type PokemonListItem = { name: string; url: string };
type PokemonDetails = {
  id: number;
  name: string;
  image: string;
  height: number;
  weight: number;
  baseExperience: number;
  types: string[];
  abilities: string[];
  stats: { name: string; value: number }[];
};

// ── Animated stat bar ────────────────────────────────────────────
function StatBar({ name, value }: { name: string; value: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: value / 255,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const fillColor = value >= 80 ? '#4CAF50' : value >= 50 ? '#FFD600' : '#FF5A1F';

  return (
    <View style={styles.statRow}>
      <Text style={styles.statName}>{name.replace('special-', 'sp.')}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <View style={styles.statTrack}>
        <Animated.View
          style={[
            styles.statFill,
            {
              backgroundColor: fillColor,
              width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>
    </View>
  );
}

// ── Type badge ───────────────────────────────────────────────────
function TypeBadge({ type }: { type: string }) {
  return (
    <View style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[type] ?? '#888' }]}>
      <Text style={styles.typeBadgeText}>{type.toUpperCase()}</Text>
    </View>
  );
}

// ── Pokémon list card ────────────────────────────────────────────
function ListCard({ item }: { item: Pokemon }) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <TouchableOpacity activeOpacity={1} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[styles.listCard, { transform: [{ scale }] }]}>
        <Image source={{ uri: item.image }} style={styles.listCardImage} />
        <Text style={styles.listCardName}>{item.name}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Main App ─────────────────────────────────────────────────────
export default function App() {
  const [pokemons, setPokemons] = useState<Pokemon[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchedPokemon, setSearchedPokemon] = useState<PokemonDetails | null>(null);
  const [searchError, setSearchError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  const cardAnim = useRef(new Animated.Value(0)).current;
  const imageRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function fetchPokemons() {
      const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=100000');
      const data: { results: PokemonListItem[] } = await response.json();
      const list = data.results.map((item) => {
        const id = item.url.split('/').filter(Boolean).pop();
        return {
          name: item.name,
          image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
        };
      });
      setPokemons(list);
    }
    fetchPokemons();
  }, []);

  // Animate card in when a Pokémon is found
  useEffect(() => {
    if (searchedPokemon) {
      cardAnim.setValue(0);
      Animated.spring(cardAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }).start();

      // Spin the image once
      imageRotate.setValue(0);
      Animated.timing(imageRotate, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, [searchedPokemon]);

  async function handleSearch() {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      setSearchError('Digite o nome do pokémon.');
      setSearchedPokemon(null);
      return;
    }
    setSearchLoading(true);
    setSearchError('');
    setSearchedPokemon(null);

    try {
      const response = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(query)}`
      );
      if (!response.ok) throw new Error('not found');
      const data = await response.json();

      const details: PokemonDetails = {
        id: data.id,
        name: data.name,
        image:
          data.sprites?.other?.['official-artwork']?.front_default ||
          data.sprites?.front_default ||
          `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${data.id}.png`,
        height: data.height,
        weight: data.weight,
        baseExperience: data.base_experience,
        types: data.types.map((i: any) => i.type.name),
        abilities: data.abilities.map((i: any) => i.ability.name),
        stats: data.stats.map((i: any) => ({ name: i.stat.name, value: i.base_stat })),
      };
      setSearchedPokemon(details);
    } catch {
      setSearchError('Pokémon não encontrado. Verifique o nome e tente novamente.');
    } finally {
      setSearchLoading(false);
    }
  }

  const primaryType = searchedPokemon?.types?.[0] ?? 'normal';
  const accentColor = TYPE_COLORS[primaryType] ?? '#FFD600';

  const spinDeg = imageRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const cardTranslateY = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0],
  });

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View style={styles.headerDot} />
        <Text style={styles.headerTitle}>POKÉDEX</Text>
        <View style={styles.headerLights}>
          <View style={[styles.headerLight, { backgroundColor: '#FF5A5F' }]} />
          <View style={[styles.headerLight, { backgroundColor: '#FFD600' }]} />
          <View style={[styles.headerLight, { backgroundColor: '#4CAF50' }]} />
        </View>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={handleSearch}
            placeholder="bulbasaur, pikachu, mewtwo..."
            placeholderTextColor="#666"
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch} activeOpacity={0.8}>
          <Text style={styles.searchButtonText}>GO</Text>
        </TouchableOpacity>
      </View>

      {searchLoading && (
        <View style={styles.centerRow}>
          <ActivityIndicator size="small" color="#FFD600" />
          <Text style={styles.loadingText}> Capturando...</Text>
        </View>
      )}
      {!!searchError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠ {searchError}</Text>
        </View>
      )}

      {searchedPokemon && (
        <Animated.View
          style={[
            styles.card,
            {
              borderColor: accentColor,
              opacity: cardAnim,
              transform: [{ translateY: cardTranslateY }],
            },
          ]}
        >
          <View style={[styles.glowBlob, { backgroundColor: accentColor + '30' }]} />

          <View style={styles.cardTop}>
            <View style={styles.cardMeta}>
              <Text style={[styles.pokemonId, { color: accentColor }]}>
                #{String(searchedPokemon.id).padStart(3, '0')}
              </Text>
              <Text style={styles.pokemonName}>{searchedPokemon.name}</Text>
              <View style={styles.typeRow}>
                {searchedPokemon.types.map((t) => (
                  <TypeBadge key={t} type={t} />
                ))}
              </View>
              <View style={styles.infoGrid}>
                <View style={styles.infoCell}>
                  <Text style={styles.infoLabel}>ALTURA</Text>
                  <Text style={styles.infoVal}>{(searchedPokemon.height / 10).toFixed(1)} m</Text>
                </View>
                <View style={styles.infoCell}>
                  <Text style={styles.infoLabel}>PESO</Text>
                  <Text style={styles.infoVal}>{(searchedPokemon.weight / 10).toFixed(1)} kg</Text>
                </View>
                <View style={styles.infoCell}>
                  <Text style={styles.infoLabel}>EXP BASE</Text>
                  <Text style={styles.infoVal}>{searchedPokemon.baseExperience}</Text>
                </View>
              </View>
            </View>

            <Animated.Image
              source={{ uri: searchedPokemon.image }}
              style={[styles.pokemonImage, { transform: [{ rotate: spinDeg }] }]}
            />
          </View>

          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionLabel, { color: accentColor }]}>HABILIDADES</Text>
            <View style={styles.abilitiesRow}>
              {searchedPokemon.abilities.map((a) => (
                <View key={a} style={[styles.abilityChip, { borderColor: accentColor }]}>
                  <Text style={[styles.abilityText, { color: accentColor }]}>{a}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionLabel, { color: accentColor }]}>STATUS BASE</Text>
            {searchedPokemon.stats.map((s) => (
              <StatBar key={s.name} name={s.name} value={s.value} />
            ))}
          </View>
        </Animated.View>
      )}

      {!searchedPokemon && pokemons.length > 0 && (
        <>
          <FlatList
            data={pokemons}
            keyExtractor={(item) => item.name}
            numColumns={3}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => <ListCard item={item} />}
          />
        </>
      )}
    </View>
  );
}

const CARD_RADIUS = 20;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F0F14',
    paddingTop: Platform.OS === 'android' ? 36 : 54,
    paddingHorizontal: 14,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 10,
  },
  headerDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2196F3',
    borderWidth: 3,
    borderColor: '#fff',
  },
  headerTitle: {
    flex: 1,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    fontSize: 22,
    fontWeight: '900',
    color: '#FFD600',
    letterSpacing: 8,
  },
  headerLights: { flexDirection: 'row', gap: 6 },
  headerLight: { width: 10, height: 10, borderRadius: 5 },

  // Search
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A24',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 12,
    height: 46,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  searchButton: {
    width: 56,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FFD600',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#0F0F14',
    fontWeight: '900',
    fontSize: 15,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },

  // Feedback
  centerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  loadingText: {
    color: '#FFD600',
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    fontSize: 13,
  },
  errorBox: {
    backgroundColor: '#2A0A0A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#8B0000',
    padding: 10,
    marginBottom: 10,
  },
  errorText: {
    color: '#FF5252',
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    fontSize: 13,
  },

  // Result card
  card: {
    backgroundColor: '#1A1A24',
    borderRadius: CARD_RADIUS,
    borderWidth: 2,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  glowBlob: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardMeta: { flex: 1 },
  pokemonId: {
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 2,
  },
  pokemonName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    textTransform: 'capitalize',
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    letterSpacing: 1,
    marginBottom: 8,
  },
  typeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  typeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    letterSpacing: 1,
  },
  infoGrid: { flexDirection: 'row', gap: 10 },
  infoCell: { alignItems: 'flex-start' },
  infoLabel: {
    color: '#555',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  infoVal: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  pokemonImage: {
    width: 130,
    height: 130,
    resizeMode: 'contain',
    marginLeft: 6,
  },

  // Sections
  sectionBlock: { marginBottom: 12 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 3,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    marginBottom: 8,
  },
  abilitiesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  abilityChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  abilityText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },

  // Stat bars
  statRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  statName: {
    width: 62,
    color: '#777',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    letterSpacing: 0.5,
  },
  statValue: {
    width: 30,
    color: '#ccc',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
    marginRight: 8,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  statTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#2A2A38',
    borderRadius: 3,
    overflow: 'hidden',
  },
  statFill: { height: '100%', borderRadius: 3 },

  // Grid list
  listHeading: {
    color: '#444',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    textAlign: 'center',
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    marginBottom: 10,
  },
  gridRow: { justifyContent: 'space-between', marginBottom: 10 },
  gridContent: { paddingBottom: 30 },
  listCard: {
    width: (width - 28 - 20) / 3,
    backgroundColor: '#1A1A24',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A38',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  listCardImage: { width: 64, height: 64, resizeMode: 'contain', marginBottom: 4 },
  listCardName: {
    color: '#aaa',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'capitalize',
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
});