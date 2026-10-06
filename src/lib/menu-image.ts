import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Menu photos are either bundled demo URLs ("/..." or "http...") or private storage paths that need a signed URL. */
export function useMenuImage(path?: string | null) {
  const direct = !!path && (path.startsWith("/") || path.startsWith("http"));
  const { data } = useQuery({
    queryKey: ["menu-image", path],
    enabled: !!path && !direct,
    staleTime: 50 * 60_000,
    queryFn: async () => (await supabase.storage.from("menu-images").createSignedUrl(path!, 3600)).data?.signedUrl ?? null,
  });
  return direct ? path : data ?? null;
}

export const DEMO_MENU = [
  { name: "Tofu Power Bowl", category: "Bowls", price: 249, veg: true, image_url: "/__l5e/assets-v1/baf762ee-891b-4b75-8cf8-c64686c5f3f6/bnoy-food-1.png", description: "Crispy tofu, edamame, broccoli, green chilli and steamed rice." },
  { name: "Rainbow Poke Bowl", category: "Bowls", price: 329, veg: false, image_url: "/__l5e/assets-v1/53b28401-2a90-4077-a7fd-a4e7197cbbd9/bnoy-food-2.png", description: "Marinated fish, carrots, cucumber, mango and sesame rice." },
  { name: "Salmon Avocado Bowl", category: "Bowls", price: 379, veg: false, image_url: "/__l5e/assets-v1/1348cd72-8e87-4388-bde3-3a35dab2c5fd/bnoy-food-3.png", description: "Sesame salmon cubes with avocado on sushi rice." },
  { name: "Pepperoni Pizza", category: "Pizza", price: 349, veg: false, image_url: "/__l5e/assets-v1/3ff12323-7eb8-4bb5-934c-66807f5155a6/bnoy-food-4.png", description: "Stone-baked, loaded with pepperoni and mozzarella." },
  { name: "Double Cheese Burger", category: "Burgers", price: 199, veg: false, image_url: "/__l5e/assets-v1/d4e509ea-5116-4c9a-8f59-d9b39f0c6da4/bnoy-food-5.png", description: "Two patties, cheddar, lettuce, onion and house sauce." },
  { name: "Pav Bhaji", category: "Indian", price: 149, veg: true, image_url: "/__l5e/assets-v1/c5e0b5ae-d17f-43c7-a457-72468fa77c65/bnoy-food-6.png", description: "Buttery spiced bhaji with toasted pav, onion and lime." },
  { name: "Pani Puri Platter", category: "Indian", price: 99, veg: true, image_url: "/__l5e/assets-v1/d701076a-ec96-428e-a13c-4216d6958bdc/bnoy-food-7.png", description: "Crisp puris with tangy pani, sweet chutney and potato." },
  { name: "Samosa & Chutney", category: "Snacks", price: 79, veg: true, image_url: "/__l5e/assets-v1/5719b021-ac89-4320-aef8-54ecefc228a3/bnoy-food-8.png", description: "Four samosas with noodles, mint chutney and masala chai." },
  { name: "Crispy Chicken Burger", category: "Burgers", price: 169, veg: false, image_url: "/__l5e/assets-v1/2e72ea87-5499-495c-808f-095ece6ac3ff/bnoy-menu-1.png", description: "Crunchy chicken fillet, lettuce and mayo." },
  { name: "Veggie Supreme Pizza", category: "Pizza", price: 299, veg: true, image_url: "/__l5e/assets-v1/ca965967-deb4-4b9e-a4da-46e2ed273241/bnoy-menu-2.png", description: "Peppers, olives, onion, paneer and herbs." },
  { name: "Grilled Sandwich", category: "Snacks", price: 129, veg: true, image_url: "/__l5e/assets-v1/156dc083-ba15-4bf2-9297-e66b1974a6fd/bnoy-menu-3.png", description: "Cheese and veggie grilled toastie." },
  { name: "Club Sub", category: "Snacks", price: 159, veg: false, image_url: "/__l5e/assets-v1/cdff3b78-ef85-453c-8220-a6ff09aba3bc/bnoy-menu-4.png", description: "Soft roll with ham, cheese and fresh lettuce." },
  { name: "French Fries", category: "Snacks", price: 99, veg: true, image_url: "/__l5e/assets-v1/d60a27e5-e16d-4139-9dd3-9fd1a01a72e3/bnoy-menu-5.png", description: "Golden salted fries." },
  { name: "Four Cheese Pizza", category: "Pizza", price: 329, veg: true, image_url: "/__l5e/assets-v1/1b4380eb-5f10-4a4e-9c46-52760cb80caa/bnoy-menu-6.png", description: "Mozzarella, cheddar, parmesan and gouda." },
  { name: "Golgappa Thali", category: "Indian", price: 119, veg: true, image_url: "/__l5e/assets-v1/781ab3a3-422e-4574-b34e-d92ee70a39ac/bnoy-paani-puri.jpeg", description: "Street-style golgappe with three flavoured waters." },
];
