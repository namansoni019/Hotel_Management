import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface MemoryRecord {
  id: string;
  event_name: string;
  event_type: 'wedding' | 'sufi' | 'banquet' | 'festival' | 'anniversary';
  host_name: string;
  celebration_date: string;
  story: string;
  photo_url: string;
  likes_count: number;
  is_featured: boolean;
  created_at: string;
}

const LOCAL_FALLBACK_MEMORIES: MemoryRecord[] = [
  {
    id: 'mem-1',
    event_name: 'The Royal Rajputana Wedding',
    event_type: 'wedding',
    host_name: 'Devendra & Radhika Rathore',
    celebration_date: 'February 2025',
    story:
      'From the royal Shehnai welcome at the Pol gate to the candle-lit pheras by the courtyard fountain, Rajmahal gave us memories that our families will cherish for generations.',
    photo_url: '/images/hall/crystal-ballroom.jpg',
    likes_count: 342,
    is_featured: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'mem-2',
    event_name: 'Sufi & Folk Night Under The Stars',
    event_type: 'sufi',
    host_name: 'Guest: Vikram & Friends',
    celebration_date: 'January 2025',
    story:
      'Mesmerizing Manganiyar musicians, fragrant burning loban, and authentic Ker Sangri served under the star-lit Udaipur sky. Pure heaven on earth.',
    photo_url: '/images/rooms/royal-courtyard.jpg',
    likes_count: 219,
    is_featured: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'mem-3',
    event_name: 'Golden 50th Wedding Anniversary',
    event_type: 'anniversary',
    host_name: 'Col. Jaswant & Savitri Singh',
    celebration_date: 'December 2024',
    story:
      'We celebrated our 50th anniversary in the Sheesh Mahal Suite. The personalized silver thali dinner and warm hospitality made us feel like true maharaja and maharani.',
    photo_url: '/images/rooms/sheesh-mahal.jpg',
    likes_count: 512,
    is_featured: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'mem-4',
    event_name: 'Courtyard Khansama Banquet',
    event_type: 'banquet',
    host_name: 'Singhania Family Reunion',
    celebration_date: 'November 2024',
    story:
      '40 of our relatives gathered from across the world. The slow-cooked Laal Maas and melt-in-mouth churma prepared by master khansamas was the highlight of our entire trip.',
    photo_url: '/images/food/dal-baati.jpg',
    likes_count: 188,
    is_featured: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'mem-5',
    event_name: 'Deepotsav Festival of Lights',
    event_type: 'festival',
    host_name: 'Palace Annual Heritage Gala',
    celebration_date: 'October 2024',
    story:
      'Over 5,000 clay diyas lit across the grand palace courtyards, accompanied by Kathak dancers and celebratory royal sweets. An unforgettable spectacle of Rajasthan.',
    photo_url: '/images/dining/restaurant-ambiance.png',
    likes_count: 420,
    is_featured: true,
    created_at: new Date().toISOString(),
  },
];

let localMemories = [...LOCAL_FALLBACK_MEMORIES];

export const memoriesService = {
  async getMemories(eventType?: string): Promise<MemoryRecord[]> {
    try {
      const colRef = collection(db, 'royal_memories');
      const q = eventType && eventType !== 'all'
        ? query(colRef, where('is_featured', '==', true), where('event_type', '==', eventType), orderBy('created_at', 'desc'))
        : query(colRef, where('is_featured', '==', true), orderBy('created_at', 'desc'));

      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as MemoryRecord[];
      }
    } catch (err) {
      console.warn('Firestore getMemories fallback:', err);
    }

    if (eventType && eventType !== 'all') {
      return localMemories.filter((m) => m.event_type === eventType);
    }
    return localMemories;
  },

  async createMemory(data: {
    event_name: string;
    event_type: MemoryRecord['event_type'];
    host_name: string;
    celebration_date: string;
    story: string;
    photo_url?: string;
  }): Promise<MemoryRecord> {
    const created: MemoryRecord = {
      id: `mem-${Date.now()}`,
      event_name: data.event_name,
      event_type: data.event_type,
      host_name: data.host_name,
      celebration_date: data.celebration_date || 'Recent Celebration',
      story: data.story,
      photo_url: data.photo_url || '/images/hall/crystal-ballroom.jpg',
      likes_count: 1,
      is_featured: true,
      created_at: new Date().toISOString(),
    };

    try {
      const docRef = doc(db, 'royal_memories', created.id);
      await setDoc(docRef, {
        ...created,
        created_at: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore createMemory fallback:', err);
    }

    localMemories = [created, ...localMemories];
    return created;
  },

  async likeMemory(id: string): Promise<number | null> {
    try {
      const docRef = doc(db, 'royal_memories', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const nextLikes = (snap.data().likes_count || 0) + 1;
        await updateDoc(docRef, { likes_count: nextLikes });
        return nextLikes;
      }
    } catch (err) {
      console.warn('Firestore likeMemory fallback:', err);
    }

    const found = localMemories.find((m) => m.id === id);
    if (found) {
      found.likes_count += 1;
      return found.likes_count;
    }
    return null;
  },
};
