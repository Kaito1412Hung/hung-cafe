import type { ProductInput } from "../modules/products/products.schema";
import type { ProductOptionConfig } from "../modules/cart/options";

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;

type SeedProduct = Omit<ProductInput, keyof ProductOptionConfig>;

/** 14 món đầu tiên của quán */
const ORIGINAL_PRODUCTS: SeedProduct[] = [
  {
    name: "Cà Phê Sữa Đá",
    description: "Robusta Buôn Ma Thuột pha phin, hoà quyện sữa đặc béo ngậy — hương vị Sài Gòn chuẩn vị.",
    price: 29000,
    category: "coffee",
    image: unsplash("1461023058943-07fcbe16d735"),
    stock: 120,
    isAvailable: true,
    isBestSeller: true,
  },
  {
    name: "Bạc Xỉu",
    description: "Nhiều sữa, ít cà phê, thêm lớp bọt sữa mịn màng. Ngọt dịu dễ uống cho mọi người.",
    price: 35000,
    category: "coffee",
    image: unsplash("1517701604599-bb29b565090c"),
    stock: 80,
    isAvailable: true,
    isBestSeller: true,
  },
  {
    name: "Americano",
    description: "Espresso pha loãng với nước nóng, giữ trọn hậu vị chua thanh của hạt Arabica Cầu Đất.",
    price: 39000,
    category: "coffee",
    image: unsplash("1514432324607-a09d9b4aefdd"),
    stock: 60,
    isAvailable: true,
    isBestSeller: false,
  },
  {
    name: "Cappuccino",
    description: "Tỉ lệ vàng giữa espresso, sữa nóng và lớp foam dày, rắc chút bột cacao.",
    price: 49000,
    category: "coffee",
    image: unsplash("1572442388796-11668a67e53d"),
    stock: 45,
    isAvailable: true,
    isBestSeller: true,
  },
  {
    name: "Caffè Latte",
    description: "Espresso đậm đà cùng sữa tươi đánh nóng, latte art được barista vẽ tay mỗi ly.",
    price: 49000,
    category: "coffee",
    image: unsplash("1534778101976-62847782c213"),
    stock: 50,
    isAvailable: true,
    isBestSeller: false,
  },
  {
    name: "Flat White",
    description: "Double ristretto với lớp sữa microfoam mỏng — đậm vị cà phê hơn latte.",
    price: 55000,
    category: "coffee",
    image: unsplash("1485808191679-5f86510681a2"),
    stock: 30,
    isAvailable: true,
    isBestSeller: false,
  },
  {
    name: "Pour Over Cầu Đất",
    description: "Pha thủ công bằng V60, nốt hương hoa nhài, cam chanh và mật ong.",
    price: 59000,
    category: "coffee",
    image: unsplash("1442512595331-e89e73853f31"),
    stock: 0,
    isAvailable: false,
    isBestSeller: false,
  },
  {
    name: "Matcha Latte",
    description: "Matcha Uji Nhật Bản đánh tay, kết hợp sữa tươi thanh mát, ít ngọt.",
    price: 52000,
    category: "tea",
    image: unsplash("1515823064-d6e0c04616a7"),
    stock: 40,
    isAvailable: true,
    isBestSeller: true,
  },
  {
    name: "Trà Đào Cam Sả",
    description: "Trà đen ủ lạnh, đào miếng giòn ngọt, cam vàng và sả tươi thơm lừng.",
    price: 45000,
    category: "tea",
    image: unsplash("1556679343-c7306c1976bc"),
    stock: 70,
    isAvailable: true,
    isBestSeller: true,
  },
  {
    name: "Trà Ô Long Nóng",
    description: "Ô long Bảo Lộc pha ấm, hậu ngọt sâu, thích hợp cho buổi chiều thư thái.",
    price: 39000,
    category: "tea",
    image: unsplash("1558160074-4d7d8bdf4256"),
    stock: 25,
    isAvailable: true,
    isBestSeller: false,
  },
  {
    name: "Cookie Đá Xay",
    description: "Sô-cô-la đá xay mịn, bánh Oreo giòn tan, phủ kem tươi và sốt chocolate.",
    price: 55000,
    category: "freeze",
    image: unsplash("1563805042-7684c019e1cb"),
    stock: 35,
    isAvailable: true,
    isBestSeller: false,
  },
  {
    name: "Soda Chanh Bạc Hà",
    description: "Soda mát lạnh, chanh vàng tươi và lá bạc hà — giải nhiệt tức thì.",
    price: 42000,
    category: "freeze",
    image: unsplash("1551024709-8f23befc6f87"),
    stock: 55,
    isAvailable: true,
    isBestSeller: false,
  },
  {
    name: "Tiramisu",
    description: "Bánh Ý truyền thống: mascarpone béo mịn, sponge thấm espresso và rượu rum.",
    price: 45000,
    category: "cake",
    image: unsplash("1571877227200-a0d98ea607e9"),
    stock: 15,
    isAvailable: true,
    isBestSeller: true,
  },
  {
    name: "Bánh Kem Dâu",
    description: "Cốt bánh vani mềm xốp, kem tươi dâu tây Đà Lạt, trang trí cốm màu vui mắt.",
    price: 49000,
    category: "cake",
    image: unsplash("1621303837174-89787a7d4729"),
    stock: 10,
    isAvailable: true,
    isBestSeller: false,
  },
];

/** Viết gọn 1 món: tên, mô tả, giá, danh mục, mã ảnh Unsplash, tồn kho, bán chạy */
const item = (name: string, description: string, price: number, category: string, imageId: string, stock: number, isBestSeller = false): SeedProduct => ({
  name,
  description,
  price,
  category,
  image: unsplash(imageId),
  stock,
  isAvailable: true,
  isBestSeller,
});

/** 31 món thêm vào để menu đa dạng (tổng 45 món, 7 danh mục) */
const MORE_PRODUCTS: SeedProduct[] = [
  // Cà phê
  item("Cà Phê Muối", "Cà phê phin đậm vị, phủ lớp kem muối béo mặn nhẹ — ngọt, đắng, mặn hoà quyện, uống là ghiền.", 35000, "coffee", "1436491911682-72ab1d398f59", 80, true),
  item("Cà Phê Dừa", "Cà phê đen xay cùng nước cốt dừa đá mịn như kem, thơm béo kiểu Hà Nội.", 39000, "coffee", "1588413335672-87b35888b55d", 60),
  item("Espresso", "Shot espresso nguyên chất từ hạt Arabica Cầu Đất rang vừa, lớp crema vàng óng.", 32000, "coffee", "1572286258217-40142c1c6a70", 50),
  item("Cà Phê Trứng", "Lòng đỏ trứng đánh bông với sữa đặc, phủ trên cà phê phin nóng — đặc sản Hà Nội.", 45000, "coffee", "1751569543716-70c5fb9a8298", 40),
  // Trà
  item("Trà Vải Hoa Hồng", "Trà nhài ủ lạnh, vải thiều ngọt thanh và hương hoa hồng dịu nhẹ.", 45000, "tea", "1664512298340-8df247f52488", 60),
  item("Trà Sen Vàng", "Trà ô long ướp hương sen, thêm hạt sen bùi bùi và lớp kem sữa mỏng.", 42000, "tea", "1511715112108-9acc6c3ff61f", 50),
  item("Trà Chanh Giã Tay", "Chanh vàng giã tay giữ trọn tinh dầu, trà xanh mát lạnh, chua ngọt sảng khoái.", 29000, "tea", "1623084921164-4a8c5c37a912", 80),
  item("Trà Gừng Mật Ong", "Trà gừng tươi ấm nóng với mật ong rừng — dễ chịu những ngày trời mưa.", 35000, "tea", "1631029098074-be99eb2b425c", 50),
  // Trà sữa
  item("Trà Sữa Trân Châu Đường Đen", "Sữa tươi, hồng trà và trân châu nấu đường đen dẻo thơm, vằn đường đẹp mắt.", 45000, "milktea", "1741243038487-1d835e67bcbf", 80, true),
  item("Trà Sữa Ô Long Nướng", "Ô long rang đậm hương khói nhẹ, hoà cùng sữa tươi béo mà không ngấy.", 42000, "milktea", "1761673930163-8d3d6d73cd7a", 60),
  item("Hồng Trà Kem Cheese", "Hồng trà đậm vị, phủ lớp kem phô mai mặn béo — uống không cần khuấy.", 49000, "milktea", "1558857563-b371033873b8", 50),
  item("Trà Sữa Khoai Môn", "Khoai môn tươi nghiền mịn cùng trà sữa, màu tím tự nhiên, bùi và thơm.", 45000, "milktea", "1525803377221-4f6ccdaa5133", 50),
  item("Trà Sữa Thái Xanh", "Trà xanh Thái pha sữa đặc theo kiểu Bangkok, ngọt béo và thơm mùi lá dứa.", 42000, "milktea", "1623123093799-70a72826e167", 50),
  // Đá xay & Soda
  item("Chocolate Đá Xay", "Socola Bỉ xay cùng đá và sữa, phủ kem tươi và bánh quy vụn.", 55000, "freeze", "1572490122747-3968b75cc699", 40),
  item("Soda Việt Quất", "Soda tươi mát với mứt việt quất tím và chanh xanh — nhiều ga, ít ngọt.", 42000, "freeze", "1685156330898-88eb2fdd66aa", 50),
  item("Matcha Đá Xay", "Matcha Uji xay mịn cùng sữa và đá, phủ kem tươi — mát lạnh, đậm vị trà.", 55000, "freeze", "1749104028327-a33087ea4f47", 40),
  item("Soda Dâu Tây", "Dâu tây Đà Lạt dầm cùng soda và lá bạc hà, chua ngọt tươi mới.", 42000, "freeze", "1589126065327-75b44f303631", 50),
  // Nước ép & Sinh tố
  item("Nước Ép Cam Tươi", "Cam sành vắt tươi 100% mỗi ngày, không pha đường, giàu vitamin C.", 39000, "juice", "1600271886742-f049cd451bba", 60),
  item("Sinh Tố Bơ", "Bơ sáp Đắk Lắk xay cùng sữa đặc và sữa tươi, béo mịn như kem.", 49000, "juice", "1630252595285-3bbcb51378d8", 50, true),
  item("Nước Ép Dưa Hấu", "Dưa hấu đỏ ép tươi, ngọt mát tự nhiên — giải nhiệt ngày hè.", 35000, "juice", "1683531658992-b78c311900a3", 60),
  item("Sinh Tố Xoài", "Xoài cát Hoà Lộc chín vàng xay cùng sữa chua, thơm ngọt và sánh mịn.", 45000, "juice", "1623065422902-30a2d299bbe4", 50),
  item("Nước Ép Thơm Cần Tây", "Thơm, cần tây và táo xanh ép lạnh — thanh lọc cơ thể, vị dễ uống.", 39000, "juice", "1610970881699-44a5587cabec", 40),
  // Bánh ngọt
  item("Croissant Bơ Pháp", "Bánh sừng bò cán tay với bơ Pháp, vỏ giòn nhiều lớp, ruột mềm thơm bơ.", 35000, "cake", "1691480162735-9b91238080f6", 30),
  item("Bánh Su Kem", "Vỏ su giòn xốp, nhân kem trứng vani mát lạnh — hộp 3 chiếc.", 29000, "cake", "1769692406035-372b1307814f", 30),
  item("Cheesecake Chanh Dây", "Cheesecake nướng mịn béo, phủ sốt chanh dây chua ngọt và đế bánh quy bơ.", 49000, "cake", "1679735048668-e472c0958d9e", 20),
  item("Brownie Socola", "Brownie socola đen đậm vị, ngoài giòn nhẹ trong dẻo, thêm hạt óc chó.", 39000, "cake", "1636743715220-d8f8dd900b87", 25),
  item("Bông Lan Trứng Muối", "Bông lan mềm xốp, sốt bơ trứng béo ngậy, chà bông và trứng muối mằn mặn.", 39000, "cake", "1675227977042-a572dac762be", 25),
  // Đồ ăn nhẹ
  item("Bánh Mì Que Pate", "Bánh mì que giòn rụm, pate gan nhà làm và chút tương ớt cay nhẹ — combo 2 que.", 25000, "snack", "1768203631935-da182455aa6d", 40),
  item("Sandwich Gà Nướng", "Bánh mì sandwich nướng giòn, gà nướng mật ong, xà lách, cà chua và sốt mayo.", 49000, "snack", "1700937244987-92488ab2ada5", 30),
  item("Khoai Tây Chiên", "Khoai tây cắt sợi chiên vàng giòn, rắc muối và kèm tương cà, tương ớt.", 35000, "snack", "1630384060421-cb20d0e0649d", 40),
  item("Xúc Xích Nướng", "Xúc xích Đức nướng than thơm lừng, kèm mù tạt vàng và dưa leo chua.", 29000, "snack", "1598401863352-3de5501f4890", 40),
];

/** Dữ liệu sản phẩm mẫu được nạp vào DB bởi "npm run db:setup" (khi bảng món còn trống) */
export const SEED_PRODUCTS: SeedProduct[] = [...ORIGINAL_PRODUCTS, ...MORE_PRODUCTS];

/* ---------- Tuỳ chọn mặc định của từng món ---------- */
const FOOD_CATEGORIES = ["cake", "snack"];
/** Món chỉ phục vụ nóng */
const HOT_ONLY = ["Espresso", "Pour Over Cầu Đất", "Trà Gừng Mật Ong", "Trà Ô Long Nóng"];
/** Món khách được chọn nóng hoặc đá */
const HOT_OR_COLD = ["Americano", "Caffè Latte", "Cappuccino", "Flat White", "Cà Phê Trứng", "Matcha Latte"];
/** Món không chia size (1 shot / 1 phễu) */
const NO_SIZE = ["Espresso", "Pour Over Cầu Đất"];

/** Cấu hình lựa chọn của 1 món mẫu: đồ ăn không có gì; đồ uống tuỳ món; trà sữa được thêm topping */
export function optionConfigFor(p: SeedProduct): ProductOptionConfig {
  const food = FOOD_CATEGORIES.includes(p.category);
  return {
    hasSize: !food && !NO_SIZE.includes(p.name),
    hasSugar: !food,
    serve: food ? "none" : HOT_ONLY.includes(p.name) ? "hot" : HOT_OR_COLD.includes(p.name) ? "both" : "cold",
    allowToppings: p.category === "milktea",
  };
}
