import { Order } from '../types';

// Link mới nhất khách hàng cung cấp
const LATEST_URL = 'https://script.google.com/macros/s/AKfycbxGRD7tevQCimqjoyznLLnh4LJTAcYknSoDW4KaDn6JRCcsngHk4_ES_7lCIrtUK7US/exec';
const URL_VERSION = 'v4'; 

export const getScriptUrl = () => {
  const savedVersion = localStorage.getItem('APP_SCRIPT_VERSION');
  if (savedVersion !== URL_VERSION) {
    localStorage.setItem('APP_SCRIPT_URL', LATEST_URL);
    localStorage.setItem('APP_SCRIPT_VERSION', URL_VERSION);
    return LATEST_URL;
  }
  return localStorage.getItem('APP_SCRIPT_URL') || LATEST_URL;
};

export const setScriptUrl = (url: string) => {
  if (!url) {
    localStorage.removeItem('APP_SCRIPT_URL');
  } else {
    let cleanUrl = url.trim();
    if (cleanUrl.includes('macros/s/') && !cleanUrl.endsWith('/exec') && !cleanUrl.endsWith('/dev')) {
      cleanUrl = cleanUrl.replace(/\/$/, '') + '/exec';
    }
    localStorage.setItem('APP_SCRIPT_URL', cleanUrl);
    localStorage.setItem('APP_SCRIPT_VERSION', URL_VERSION);
  }
};

const parseCurrency = (value: any): number => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const s = value.toString().replace(/[^0-9.,]/g, '');
  if (!s) return 0;
  
  // Xử lý dấu phân cách hàng nghìn kiểu Việt Nam (50.000)
  if (s.includes('.') && !s.includes(',')) {
     // Nếu phần sau dấu chấm có 3 chữ số, coi như dấu phân cách nghìn
     const parts = s.split('.');
     if (parts[parts.length - 1].length === 3) return parseFloat(s.replace(/\./g, ''));
  }
  
  // Mặc định: bỏ phẩy, chuyển chấm
  return parseFloat(s.replace(/,/g, '')) || 0;
};

const parseNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  const n = parseInt(String(value).replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? 1 : n;
};

const parseDate = (value: any): string => {
  // Trả về Epoch (1970) nếu không có giá trị
  if (!value) return new Date(0).toISOString(); 

  const s = String(value).trim();
  if (s === '') return new Date(0).toISOString();

  // Thử parse định dạng Việt Nam: DD/MM/YYYY
  // Chấp nhận cả dấu /, -, .
  // Ví dụ: 27/10/2023 10:30:00 -> Lấy 27/10/2023
  const vnMatch = s.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (vnMatch) {
    // Lưu ý: new Date(year, monthIndex, day) sẽ tạo ngày theo giờ ĐỊA PHƯƠNG
    const day = parseInt(vnMatch[1], 10);
    const month = parseInt(vnMatch[2], 10) - 1; // Tháng bắt đầu từ 0
    const year = parseInt(vnMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  
  // Nếu không khớp regex trên, thử parse chuẩn ISO hoặc string tiếng Anh
  const d = new Date(s);
  return !isNaN(d.getTime()) ? d.toISOString() : new Date(0).toISOString();
};

export const fetchSalesData = async (): Promise<Order[]> => {
  try {
    const currentUrl = getScriptUrl();
    const fetchUrl = `${currentUrl}${currentUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;

    const response = await fetch(fetchUrl, {
        method: 'GET',
        redirect: 'follow',
    });

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

    const text = await response.text();
    if (text.trim().startsWith('<!doctype html')) {
        throw new Error('Script đang yêu cầu đăng nhập. Hãy chọn "Anyone" khi Deploy Web App.');
    }

    let json: any;
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error('Dữ liệu trả về không phải định dạng JSON hợp lệ.');
    }

    let rawRows: any[] = [];
    // Trường hợp 1: Dữ liệu là mảng 2 chiều [ ["Header1", "Header2"], ["Val1", "Val2"] ]
    if (Array.isArray(json) && Array.isArray(json[0])) {
      const headers = json[0].map((h: any) => String(h).toLowerCase().trim());
      rawRows = json.slice(1).map(row => {
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = row[i]; });
        return obj;
      });
    } 
    // Trường hợp 2: Dữ liệu là mảng đối tượng [ {name: "A"}, {name: "B"} ]
    else if (Array.isArray(json)) {
      rawRows = json;
    } 
    // Trường hợp 3: Dữ liệu bọc trong một trường .data hoặc .rows
    else if (json.data || json.rows) {
      const data = json.data || json.rows;
      if (Array.isArray(data) && Array.isArray(data[0])) {
          const headers = data[0].map((h: any) => String(h).toLowerCase().trim());
          rawRows = data.slice(1).map(row => {
            const obj: any = {};
            headers.forEach((h, i) => { obj[h] = row[i]; });
            return obj;
          });
      } else {
          rawRows = Array.isArray(data) ? data : [];
      }
    }

    if (rawRows.length === 0) return [];

    // Từ khóa nhận diện cột linh hoạt hơn
    const kwTime = ['thời gian', 'ngày', 'time', 'date', 'timestamp'];
    const kwAmount = ['tổng tiền', 'doanh thu', 'số tiền', 'amount', 'money', 'giá', 'thành tiền', 'tiền'];
    const kwQty = ['số đơn', 'số lượng', 'quantity', 'sl', 'count', 'đơn'];
    const kwName = ['tên khách', 'khách hàng', 'họ tên', 'tên', 'name', 'user', 'customer'];
    const kwNote = ['chi tiết', 'nội dung', 'comment', 'note', 'ghi chú', 'mô tả', 'sản phẩm'];
    const kwLink = ['link facebook', 'facebook', 'fb', 'profile', 'link'];

    return rawRows.map((row, index) => {
      const keys = Object.keys(row).map(k => k.toLowerCase());
      const getV = (kws: string[]) => {
        const k = keys.find(key => kws.some(word => key.includes(word)));
        return k ? row[Object.keys(row).find(rk => rk.toLowerCase() === k)!] : '';
      };

      return {
        id: `row-${index}`,
        date: parseDate(getV(kwTime)),
        amount: parseCurrency(getV(kwAmount)),
        quantity: parseNumber(getV(kwQty)),
        customerName: String(getV(kwName) || `Khách ${index + 1}`).trim(),
        details: String(getV(kwNote) || ''),
        facebookLink: String(getV(kwLink) || ''),
        originalData: row
      };
    });
  } catch (error: any) {
    console.error("Fetch failure:", error);
    throw error;
  }
};

export const updateCustomerNames = async (updates: { rowIndex: number, newName: string }[]) => {
  const currentUrl = getScriptUrl();
  try {
    await fetch(currentUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return { result: 'success' };
  } catch (error) {
    throw error;
  }
};

export const getMockData = (): Order[] => {
  const today = new Date();
  return Array.from({ length: 5 }, (_, i) => ({
    id: `mock-${i}`,
    date: today.toISOString(),
    amount: 250000,
    quantity: 1,
    customerName: "Khách Demo",
    details: "Sản phẩm A",
    facebookLink: "",
    originalData: {}
  }));
};