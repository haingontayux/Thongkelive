import { GoogleGenAI, SchemaType } from "@google/genai";
import { DailyStat, AnalysisResult, Order, ProductStat } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY not found in process.env");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeSalesData = async (dailyStats: DailyStat[]): Promise<AnalysisResult | null> => {
  const ai = getClient();
  if (!ai) return null;

  // Prepare a lightweight summary of the data for the prompt to save tokens
  const dataSummary = dailyStats.map(d => `${d.date}: ${d.orderCount} đơn, ${d.revenue.toLocaleString('vi-VN')} đ`).join('\n');

  const prompt = `
    Bạn là một chuyên gia phân tích dữ liệu kinh doanh.
    Dưới đây là dữ liệu bán hàng theo ngày (Ngày: Số lượng đơn, Doanh thu):
    ${dataSummary}

    Hãy phân tích dữ liệu này và trả về kết quả dưới định dạng JSON (chỉ JSON thuần túy, không markdown) với các trường sau:
    1. "summary": Tổng quan ngắn gọn về hiệu suất bán hàng.
    2. "trend": Nhận xét về xu hướng tăng/giảm.
    3. "recommendation": Một lời khuyên ngắn để cải thiện doanh số dựa trên dữ liệu.
    
    Hãy trả lời bằng tiếng Việt.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    let text = response.text;
    if (!text) return null;
    text = text.replace(/```json|```/g, '').trim();
    
    return JSON.parse(text) as AnalysisResult;
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return null;
  }
};

export const batchNormalizeNames = async (rawNames: string[]): Promise<Record<string, string>> => {
  const ai = getClient();
  if (!ai || rawNames.length === 0) return {};

  // Remove duplicates to save tokens
  const uniqueNames = [...new Set(rawNames)];
  
  // Prompt engineering specifically for the user's scraping issue
  const prompt = `
    Tôi có một danh sách tên khách hàng bị dính các văn bản rác do copy từ giao diện Facebook (ví dụ: thời gian, nút Thích, Trả lời, số phút, giờ...).
    
    Nhiệm vụ: Hãy trích xuất TÊN KHÁCH HÀNG sạch từ các chuỗi này.
    
    Quy tắc xử lý:
    1. Cắt bỏ hoàn toàn các từ khóa UI Facebook: "Thích", "Trả lời", "phút", "giờ", "hôm qua", timestamp (vd: 12:30), "Like", "Reply", "Phản hồi".
    2. Nếu tên chứa số phút/giờ ở cuối (vd: "Nguyễn Văn A 12 phút"), hãy bỏ phần thời gian.
    3. Giữ nguyên Tiếng Việt có dấu, viết hoa chữ cái đầu mỗi từ.
    4. Trả về JSON object dạng { "tên_gốc_trong_input": "tên_đã_làm_sạch" }.

    Ví dụ:
    - "Thuy NguyenHồng 391 phútThíchTrả lời" -> "Thuy Nguyen Hồng"
    - "Minh Anh 2 giờ" -> "Minh Anh"
    - "Linh Linh" -> "Linh Linh"
    - "Phạm Hùng 20:15" -> "Phạm Hùng"

    Danh sách cần xử lý:
    ${JSON.stringify(uniqueNames)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    let text = response.text;
    if (!text) return {};
    text = text.replace(/```json|```/g, '').trim();
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Name normalization failed:", error);
    // In case of error, return empty map so logic continues without changing names
    return {};
  }
};

export const analyzeBestSellers = async (orders: Order[]): Promise<ProductStat[]> => {
  const ai = getClient();
  if (!ai || orders.length === 0) return [];

  // Lọc lấy các đơn có nội dung chi tiết
  const validDetails = orders
    .filter(o => o.details && o.details.trim().length > 0)
    .map(o => `SL: ${o.quantity} | Note: ${o.details.substring(0, 150)}`); 

  if (validDetails.length === 0) return [];

  const prompt = `
    Dưới đây là danh sách chi tiết đơn hàng (SL: số lượng | Note: ghi chú sản phẩm).
    Nhiệm vụ: Hãy trích xuất và thống kê TOP 7 sản phẩm bán chạy nhất.
    
    Dữ liệu đầu vào thường chứa ngôn ngữ giao tiếp (vd: "lấy cho em cái áo", "mình lấy mẫu này") và giá tiền dính liền (vd: "Quần 150k").
    
    QUY TẮC QUAN TRỌNG:
    1. TRÍCH XUẤT DANH TỪ SẢN PHẨM CHÍNH: Bỏ qua các từ "lấy", "cho mình", "em chốt", "mẫu này", "cái này".
    2. LOẠI BỎ GIÁ TIỀN: Nếu tên sản phẩm có dính giá (vd: "Áo thun 39k", "Váy 150"), hãy xoá giá tiền, chỉ giữ lại "Áo thun", "Váy".
    3. GỘP BIẾN THỂ: Gộp các sản phẩm giống nhau về bản chất. 
       Ví dụ: "Áo phông trắng", "Áo phông size L", "Áo phông 50k" -> GỘP THÀNH "Áo phông".
       Ví dụ: "Xám 39k (39k)", "Xám" -> GỘP THÀNH "Xám" (hoặc tên sản phẩm nếu đoán được là Áo/Quần).
    4. Nếu Note chỉ là màu sắc (vd: "Xám", "Đen"), hãy giữ nguyên màu đó làm tên sản phẩm nếu không có thông tin khác.
    5. TRẢ VỀ JSON Array: [{ "name": "Tên sản phẩm (đã chuẩn hóa ngắn gọn)", "quantity": Tổng_Số_Lượng }] sắp xếp giảm dần theo quantity.

    Dữ liệu cần xử lý:
    ${validDetails.join('\n')}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    let text = response.text;
    if (!text) return [];
    text = text.replace(/```json|```/g, '').trim();

    const result = JSON.parse(text);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Product analysis failed:", error);
    return [];
  }
};