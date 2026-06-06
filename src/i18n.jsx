// 极简双语：中文原文即 key，英文从字典查；查不到回退中文，所以漏翻也不会坏
// Minimal i18n: Chinese source string is the key; English looked up from dict; falls back to Chinese.
import { createContext, useContext, useState, useCallback } from 'react';

const EN = {
  // 导航 / nav
  '按摩院柜台': 'Massage Counter',
  '工作台': 'Dashboard', '会员': 'Members', '预约': 'Appointments',
  '收银': 'Checkout', '报表': 'Reports', '设置': 'Settings',

  // 通用 / common
  '搜索': 'Search', '备注': 'Note', '余额': 'Balance', '积分': 'Points',
  '元': 'CNY', '支付方式': 'Payment', '微信': 'WeChat', '支付宝': 'Alipay',
  '现金': 'Cash', '银行卡': 'Card', '会员余额': 'Member Balance',
  '今天': 'Today', '查询': 'Query', '合计': 'Total', '暂无数据': 'No data',
  '暂无记录': 'No records', '散客': 'Walk-in', '未分配': 'Unassigned',
  '未分配技师': 'No therapist', '未排房': 'No room', '正常': 'Active', '冻结': 'Frozen',

  // 工作台 / dashboard
  '今日营业额': "Today's Revenue", '今日充值': "Today's Top-ups",
  '今日新会员': 'New Members', '今日预约': "Today's Appointments",
  '笔订单': ' orders', '已完成': 'done', '今天还没有预约': 'No appointments today',

  // 预约状态 / appointment status
  '已预约': 'Booked', '已到店': 'Checked in', '已取消': 'Cancelled', '爽约': 'No-show',
  '到店': 'Check in', '完成': 'Done', '取消': 'Cancel',

  // 会员 / members
  '会员卡': 'Membership Card', '＋ 开卡': '+ New Card', '开卡': 'New Card',
  '搜索卡号 / 姓名 / 手机号': 'Search card no. / name / phone',
  '暂无会员，点右上角开卡': 'No members yet — tap "New Card" top-right',
  '开通会员卡': 'Open Membership Card', '卡号 *': 'Card No. *', '姓名 *': 'Name *',
  '手机号': 'Phone', '性别': 'Gender', '女': 'Female', '男': 'Male', '其他': 'Other',
  '会员等级': 'Level', '普通会员': 'Regular', '黄金会员': 'Gold', '钻石会员': 'Diamond',
  '确认开卡': 'Create Card', '开卡成功': 'Card created',
  '充值': 'Top-up', '扣款': 'Deduct', '次卡': 'Pass', '储值余额': 'Stored Balance',
  '充值金额(元)': 'Top-up (CNY)', '赠送金额(元)': 'Bonus (CNY)',
  '确认充值': 'Confirm Top-up', '充值成功': 'Top-up done',
  '扣款金额(元)': 'Deduct (CNY)', '余额扣款': 'Deduct from Balance', '扣款成功': 'Deducted',
  '期限卡': 'Period card', '到期': 'Expires', '核销1次': 'Redeem 1', '核销成功': 'Redeemed',
  '剩': 'Left', '次': 'left',
  '暂无次卡': 'No passes', '消费/充值流水': 'Transactions',

  // 预约 / appointments
  '预约排班': 'Appointments', '＋ 新预约': '+ New', '当天没有预约': 'No appointments this day',
  '新预约': 'New Appointment', '会员（可选，散客留空）': 'Member (optional)',
  '散客姓名': 'Walk-in name', '时间': 'Time', '技师': 'Therapist',
  '服务项目': 'Service', '房间': 'Room', '选择': 'Select', '创建预约': 'Create',
  '预约已创建': 'Appointment created',

  // 收银 / checkout
  '收银台': 'Checkout', '商品': 'Products', '暂无商品（去设置里添加）': 'No products (add in Settings)',
  '当前账单': 'Current Bill', '散客（不绑定会员）': 'Walk-in (no member)',
  '点左侧添加项目': 'Add items from the left', '选技师': 'Therapist',
  '确认结账': 'Checkout', '请先添加项目': 'Add an item first',
  '余额支付需选择会员': 'Balance payment needs a member', '结账成功': 'Paid',
  '库存': 'Stock', '分钟': 'min',

  // 报表 / reports
  '起': 'From', '止': 'To', '营业额': 'Revenue', '订单数': 'Orders',
  '充值总额': 'Total Top-ups', '新会员': 'New Members',
  '支付方式分布': 'Payment Breakdown', '技师业绩 / 提成': 'Therapist Sales / Commission',
  '业绩': 'Sales', '提成': 'Commission', '近30天营业额': 'Revenue (last 30 days)',

  // 设置 / settings
  '设置 · 基础资料': 'Settings · Master Data',
  '员工/技师': 'Staff', '员工技师': 'Staff', '名称': 'Name', '分类': 'Category',
  '时长(分)': 'Duration (min)', '价格': 'Price', '类型': 'Type', '售价': 'Sell Price',
  '赠送': 'Bonus', '次数': 'Times', '角色': 'Role', '提成比例': 'Commission %',
  '房间/床位': 'Rooms', '卡类型': 'Card Types',
  '＋ 添加': '+ Add', '已添加': 'Added', '停用': 'Disable', '已停用': 'Disabled',
  '前台': 'Front Desk', '管理员': 'Admin',
  '储值卡': 'Stored-value', '期限卡 ': 'Period',

  // 登录 / login
  '按摩院平台': 'Massage Platform', '账号': 'Username', '密码': 'Password', '登录': 'Log in',
  '演示账号（点击填入）': 'Demo accounts (click to fill)', '店': 'shop',
  '退出': 'Log out', '平台': 'Platform', '平台管理': 'Platform Admin',

  // 平台管理员 / admin
  '平台管理员': 'Platform Admin', '平台概览': 'Overview', '门店管理': 'Shops', '店间结算': 'Settlement',
  '入驻门店': 'Active Shops', '平台会员': 'Members', '钱包总余额(负债)': 'Wallet Liability',
  '期间营业额': 'Revenue', '期间订单': 'Orders', '期间充值': 'Top-ups',
  '「钱包总余额」是所有会员未消费的储值，属于平台对会员的负债，结算时要心里有数。':
    'Wallet Liability is unspent member stored value — money the platform owes members. Keep it in mind during settlement.',
  '＋ 入驻新门店': '+ Onboard Shop', '入驻新门店': 'Onboard New Shop', '门店已入驻': 'Shop onboarded',
  '营业中': 'Open', '已暂停': 'Suspended', '订单': 'Orders', '暂停营业': 'Suspend', '恢复营业': 'Reactivate',
  '门店名称 *': 'Shop Name *', '城市': 'City', '地址': 'Address', '电话': 'Phone', '简介': 'Intro',
  '店老板登录账号 *': 'Owner Username *', '店老板密码 *': 'Owner Password *', '确认入驻': 'Confirm Onboarding',
  '净额 = 该店收的充值款 − 该店核销的服务额。正数=该店欠平台，负数=平台应付该店。':
    'Net = top-ups collected − service value redeemed. Positive: shop owes platform; negative: platform owes shop.',
  '全部': 'All', '门店': 'Shop', '收款(充值)': 'Collected (top-up)', '核销(服务)': 'Redeemed (service)',
  '净额': 'Net', '结算方向': 'Direction', '该店付平台': 'Shop → Platform', '平台付该店': 'Platform → Shop',
  '持平': 'Even', '合计净额': 'Total Net',

  // 顾客端 / customer marketplace
  '找店': 'Find', '我的': 'My Account', '找按摩院': 'Find a Massage Shop',
  '选择门店，在线预约': 'Pick a shop and book online', '全部城市': 'All cities',
  '项服务': 'services', '低至': 'from', '该城市暂无门店': 'No shops in this city yet',
  '返回门店列表': 'Back to shops', '立即预约': 'Book',
  '预约成功': 'Booked', '预约已提交！': 'Booking submitted!',
  '到店出示手机号即可，门店会为你安排。': 'Just show your phone number on arrival — the shop will arrange it.',
  '日期': 'Date', '指定技师（可选）': 'Therapist (optional)', '不指定': 'Any', '你的姓名': 'Your name',
  '我的余额（全平台通用）': 'My Balance (works at all shops)', '我的次卡': 'My Passes',
  '消费记录（跨店）': 'History (all shops)', '我的预约': 'My Bookings', '退出会员': 'Log out',
  '会员登录': 'Member Login', '查看你的余额与消费记录': 'Check your balance and history',
  '会员卡号': 'Card Number', '演示：VIP0001 / 012-3456789': 'Demo: VIP0001 / 012-3456789',
};

const LangCtx = createContext({ lang: 'zh', t: (s) => s, toggle: () => {} });
export const useT = () => useContext(LangCtx);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'zh');
  const t = useCallback((s) => (lang === 'en' ? EN[s] || s : s), [lang]);
  const toggle = useCallback(() => {
    setLang((cur) => {
      const next = cur === 'zh' ? 'en' : 'zh';
      localStorage.setItem('lang', next);
      return next;
    });
  }, []);
  return <LangCtx.Provider value={{ lang, t, toggle }}>{children}</LangCtx.Provider>;
}
