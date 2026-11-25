import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { dataRepository } from '@/lib/data/repository';
import type { MenuCategory, MenuItem } from '@/lib/types';

/**
 * Pure function to map raw Firestore items and categories into structured MenuCategory list
 */
export function buildCategoriesFromItems(
  allItems: MenuItem[],
  dbCategories: Array<Partial<MenuCategory> & { id: string }>,
  outletId?: string
): MenuCategory[] {
  if (allItems.length === 0 && dbCategories.length === 0) {
    return [];
  }

  const categoryMap = new Map<string, MenuCategory>();

  // 1. Register categories from Firestore dbCategories
  for (const cat of dbCategories) {
    categoryMap.set(cat.id, {
      id: cat.id,
      outlet_id: cat.outlet_id || 'e0000000-0000-0000-0000-000000000001',
      name: cat.name || 'Specialties',
      sort_order: cat.sort_order ?? 99,
      is_available: cat.is_available ?? true,
      items: [],
    });
  }

  // 2. Distribute allItems into categories, auto-generating missing categories from category_id
  for (const item of allItems) {
    const catId = item.category_id || 'cat-general';
    if (!categoryMap.has(catId)) {
      let name = 'Palace Specialties';
      let catOutletId = 'e0000000-0000-0000-0000-000000000001'; // restaurant default

      const lowerCat = catId.toLowerCase();
      const lowerName = (item.name || '').toLowerCase();
      const isCafe = lowerCat.includes('cafe') || /coffee|tea|chai|brew|cafe|bakery|cake|pastry|noodle|snack/i.test(lowerName);

      if (isCafe) {
        catOutletId = 'e0000000-0000-0000-0000-000000000002'; // cafe
      }

      if (catId === 'cat-cafe-1' || lowerCat.includes('cafe-1')) {
        name = 'Artisanal Brews & Delicacies';
      } else if (catId === 'cat-cafe-2' || lowerCat.includes('cafe-2')) {
        name = 'Palace Bakery & Quick Bites';
      } else if (catId === 'cat-1' || lowerCat.includes('starter')) {
        name = 'Royal Starters & Tandoor';
      } else if (catId === 'cat-2' || lowerCat.includes('thali')) {
        name = 'Royal Thalis & Feasts';
      } else if (catId === 'cat-3' || lowerCat.includes('main')) {
        name = 'Mewari Royal Mains';
      } else if (catId === 'cat-4' || lowerCat.includes('bread') || lowerCat.includes('dessert')) {
        name = 'Royal Breads & Desserts';
      } else {
        name = catId
          .replace(/^cat-/, '')
          .replace(/^cat_/, '')
          .split(/[-_]/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }

      categoryMap.set(catId, {
        id: catId,
        outlet_id: catOutletId,
        name,
        sort_order: 99,
        is_available: true,
        items: [],
      });
    }

    categoryMap.get(catId)!.items!.push(item);
  }

  let result = Array.from(categoryMap.values());

  if (outletId) {
    result = result.filter((c) => {
      if (outletId.includes('2') || outletId === 'cafe') {
        return c.outlet_id === outletId || c.outlet_id?.includes('2') || c.id.includes('cafe');
      }
      return c.outlet_id === outletId || (!c.outlet_id?.includes('2') && !c.id.includes('cafe'));
    });
  }

  return result
    .sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99))
    .map((c) => ({
      ...c,
      items: (c.items || []).sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99)),
    }));
}

export const menuService = {
  async getMenuCategories(outletId?: string): Promise<MenuCategory[]> {
    try {
      // 1. Fetch all items from Firestore 'menu_items'
      const itemRef = collection(db, 'menu_items');
      const itemSnapshot = await getDocs(itemRef);
      const allItems = itemSnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as MenuItem[];

      // 2. Fetch categories from Firestore 'menu_categories'
      const catRef = collection(db, 'menu_categories');
      const catSnapshot = await getDocs(catRef);
      const dbCategories = catSnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Array<Partial<MenuCategory> & { id: string }>;

      return buildCategoriesFromItems(allItems, dbCategories, outletId);
    } catch (err) {
      console.warn('Firestore menu read error:', err);
      return [];
    }
  },

  async addMenuItem(itemData: Partial<MenuItem> & {
    category_id: string;
    name: string;
    price_minor: number;
  }): Promise<MenuItem> {
    try {
      const itemRef = collection(db, 'menu_items');
      const docRef = await addDoc(itemRef, {
        category_id: itemData.category_id,
        name: itemData.name,
        description: itemData.description || '',
        price_minor: itemData.price_minor,
        dietary_labels: itemData.dietary_labels || ['Vegetarian'],
        image_url: itemData.image_url || '/images/dining_ambiance.jpg',
        is_available: itemData.is_available ?? true,
        sort_order: itemData.sort_order ?? 99,
        discount_percent: itemData.discount_percent ?? 0,
        discount_price_minor: itemData.discount_price_minor ?? itemData.price_minor,
        prep_time_minutes: itemData.prep_time_minutes ?? 15,
        portions: itemData.portions || [],
        extras: itemData.extras || [],
        single_choice_extras: itemData.single_choice_extras ?? false,
        portion_wise_extras: itemData.portion_wise_extras ?? false,
        track_quantity: itemData.track_quantity ?? false,
        stock_quantity: itemData.stock_quantity ?? 0,
        created_at: serverTimestamp(),
      });

      const localItem = dataRepository.addMenuItem(itemData);
      return {
        ...localItem,
        id: docRef.id,
      };
    } catch (err) {
      console.warn('Firestore addMenuItem fallback to local repository:', err);
      return dataRepository.addMenuItem(itemData);
    }
  },

  async updateMenuItem(
    itemId: string,
    updates: Partial<MenuItem>
  ): Promise<MenuItem | null> {
    try {
      const itemRef = doc(db, 'menu_items', itemId);
      await updateDoc(itemRef, {
        ...updates,
        updated_at: serverTimestamp(),
      });
      const updatedSnap = await getDoc(itemRef);
      if (updatedSnap.exists()) {
        const itemData = {
          id: itemId,
          ...updatedSnap.data(),
        } as MenuItem;
        dataRepository.updateMenuItem(itemId, updates);
        return itemData;
      }
    } catch (err) {
      console.warn('Firestore updateMenuItem error:', err);
    }
    return dataRepository.updateMenuItem(itemId, updates);
  },

  async toggleItemAvailability(itemId: string): Promise<boolean> {
    try {
      const itemRef = doc(db, 'menu_items', itemId);
      const snap = await getDoc(itemRef);
      if (snap.exists()) {
        const currentData = snap.data();
        const nextState = currentData.is_available === false ? true : false;
        await updateDoc(itemRef, {
          is_available: nextState,
          updated_at: serverTimestamp(),
        });
        dataRepository.toggleItemAvailability(itemId);
        return nextState;
      }
    } catch (err) {
      console.warn('Firestore toggleItemAvailability error:', err);
    }
    return dataRepository.toggleItemAvailability(itemId);
  },

  async deleteMenuItem(itemId: string): Promise<boolean> {
    try {
      const itemRef = doc(db, 'menu_items', itemId);
      await deleteDoc(itemRef);
    } catch {
      // Ignored
    }
    return dataRepository.deleteMenuItem(itemId);
  },

  async addCategory(data: { name: string; outlet_id?: string; image_url?: string }): Promise<MenuCategory> {
    try {
      const catRef = collection(db, 'menu_categories');
      const docRef = await addDoc(catRef, {
        name: data.name,
        outlet_id: data.outlet_id || 'e0000000-0000-0000-0000-000000000001',
        sort_order: 99,
        is_available: true,
        created_at: serverTimestamp(),
      });

      const localCat = dataRepository.addCategory(data);
      return {
        ...localCat,
        id: docRef.id,
      };
    } catch (err) {
      console.warn('Firestore addCategory fallback:', err);
      return dataRepository.addCategory(data);
    }
  },

  async updateCategory(catId: string, updates: Partial<MenuCategory>): Promise<MenuCategory | null> {
    try {
      const catRef = doc(db, 'menu_categories', catId);
      await updateDoc(catRef, {
        ...updates,
        updated_at: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore updateCategory fallback:', err);
    }
    return dataRepository.updateCategory(catId, updates);
  },

  async deleteCategory(catId: string): Promise<boolean> {
    try {
      const catRef = doc(db, 'menu_categories', catId);
      await deleteDoc(catRef);
    } catch {
      // Ignored
    }
    return dataRepository.deleteCategory(catId);
  },
};
