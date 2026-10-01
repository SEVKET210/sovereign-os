/* ============================================================
   SOVEREIGN-OS — Granular Role-Based Access Control (RBAC)
   Defines universal system permissions, role descriptors, and
   clearance capabilities separating Founder/Manager, Employee,
   and Intern roles.
   ============================================================ */

import type { SystemRole } from './team';
import type { ClearanceLevel } from './index';

export type Permission =
  // Treasury OS
  | 'treasury:view_reserves'
  | 'treasury:view_ledger'
  | 'treasury:transact'
  | 'treasury:fund'
  | 'treasury:purge'

  // Team & Governance
  | 'team:view'
  | 'team:invite'
  | 'team:approve'
  | 'team:manage_roles'

  // Secure Vault
  | 'vault:view_classified'
  | 'vault:upload'
  | 'vault:delete'

  // Blueprint DAG & Kanban
  | 'blueprint:view'
  | 'blueprint:create'
  | 'blueprint:edit'
  | 'blueprint:delete'

  // Docs Workspace
  | 'docs:view_classified'
  | 'docs:edit'
  | 'docs:delete'
  | 'docs:seal'

  // Comms Relay
  | 'comms:access_executive'
  | 'comms:seal_decision'

  // Security & Enclave Cockpit
  | 'security:emergency_cockpit'
  | 'security:root_keys';

export interface RoleDefinition {
  role: SystemRole;
  labelTr: string;
  labelEn: string;
  badgeEmoji: string;
  clearance: ClearanceLevel;
  shortDescTr: string;
  /** Short one-liner shown in RoleSwitcher badge dropdown */
  descriptionTr?: string;
  canSeeTr: string[];
  canEditTr: string[];
  canExecuteTr: string[];
  permissions: Permission[];
}

export const ROLE_DEFINITIONS: Record<SystemRole, RoleDefinition> = {
  Founder: {
    role: 'Founder',
    labelTr: 'Yönetici / Kurucu',
    labelEn: 'Executive / Founder',
    badgeEmoji: '👑',
    clearance: 'LEVEL_4',
    shortDescTr: 'En üst düzey kurucu ve sistem yöneticisi yetkisi. Tüm sistem üzerinde mutlak görme, değiştirme ve yönetim haklarına sahiptir.',
    canSeeTr: [
      'Tüm kurumsal kasa rezervleri, bilanço ve likidite akışları',
      'Şifreli zincir defter blokları, denetim imzaları ve hash zinciri',
      'Enklav kök anahtarları, acil durum protokolleri ve duress ayarları',
      'Tüm ekip üyeleri, başvuru kuyruğu ve güvenlik telemetrisi',
      'Kasada saklanan Seviye-4 dahil tüm gizli ve şifreli belgeler',
    ],
    canEditTr: [
      'Tüm kasa defterini sıfırlama (Master Ledger Purge)',
      'Kasaları fonlama, sermaye enjeksiyonu ve çekim işlemleri',
      'Yeni finansal işlem ve kurumsal transfer ekleme',
      'Operatör ekleme, çıkarma, departman ve yetki seviyesini (L1-L4) değiştirme',
      'Kasa belgelerini silme, şifreleme ve indirme',
      'Blueprint ana mimari düğümlerini oluşturma, düzenleme ve silme',
    ],
    canExecuteTr: [
      'Kriptografik davetiye (Invite Token) üretme ve iptal etme',
      'Bekleyen üye başvurularını onaylama veya reddetme',
      'Acil durum güvenlik kokpitini (Emergency Cockpit) devreye alma',
      'Karar mühürleme ve çoklu-imza mutabakatını yürütme',
    ],
    permissions: [
      'treasury:view_reserves',
      'treasury:view_ledger',
      'treasury:transact',
      'treasury:fund',
      'treasury:purge',
      'team:view',
      'team:invite',
      'team:approve',
      'team:manage_roles',
      'vault:view_classified',
      'vault:upload',
      'vault:delete',
      'blueprint:view',
      'blueprint:create',
      'blueprint:edit',
      'blueprint:delete',
      'docs:view_classified',
      'docs:edit',
      'docs:delete',
      'docs:seal',
      'comms:access_executive',
      'comms:seal_decision',
      'security:emergency_cockpit',
      'security:root_keys',
    ],
  },

  'Lead Architect': {
    role: 'Lead Architect',
    labelTr: 'Yönetici / Takım Lideri',
    labelEn: 'Lead Architect / Manager',
    badgeEmoji: '🛡️',
    clearance: 'LEVEL_3',
    shortDescTr: 'Departman yöneticisi ve teknik lider. Operasyonel kasaları, takım görevlerini ve dokümanları tam yetkiyle yönetir; ancak root defteri sıfırlayamaz.',
    canSeeTr: [
      'Hazine rezervleri ve operasyonel nakit akışı',
      'Tüm Blueprint mimarisi ve görev matrisi',
      'Departman üyeleri ve görev yükleri',
      'Yetkili olduğu Seviye-3 kasa dosyaları',
    ],
    canEditTr: [
      'İşlem ve harcama kayıtları ekleme',
      'Görevleri atama, taşıma, düzenleme ve tamamlama',
      'Doküman ve kasa dosyası yükleme',
      'Kendi departmanındaki görev düğümlerini silme',
    ],
    canExecuteTr: [
      'Operasyonel harcama onayları',
      'Takım içi iş akışı yönlendirme',
    ],
    permissions: [
      'treasury:view_reserves',
      'treasury:view_ledger',
      'treasury:transact',
      'team:view',
      'vault:view_classified',
      'vault:upload',
      'blueprint:view',
      'blueprint:create',
      'blueprint:edit',
      'blueprint:delete',
      'docs:view_classified',
      'docs:edit',
      'docs:delete',
      'docs:seal',
      'comms:access_executive',
      'comms:seal_decision',
    ],
  },

  'Senior Operator': {
    role: 'Senior Operator',
    labelTr: 'Kıdemli Operatör',
    labelEn: 'Senior Operator',
    badgeEmoji: '⚡',
    clearance: 'LEVEL_2',
    shortDescTr: 'Kıdemli operasyon uzmanı. Görevleri ve günlük operasyonel harcama işlemlerini yürütür.',
    canSeeTr: [
      'Operasyonel nakit (Petty Cash) ve genel bilanço',
      'Atanan Blueprint görevleri ve ekip panosu',
      'Genel şirket dokümanları ve fihrist',
    ],
    canEditTr: [
      'Standart operasyonel harcama işlemleri ekleme',
      'Görevleri güncelleme, ilerletme ve tamamlama',
      'Dokümantasyon notları ekleme ve düzenleme',
    ],
    canExecuteTr: [
      'Kendi görevlerini teslim etme ve mesajlaşma',
    ],
    permissions: [
      'treasury:view_reserves',
      'treasury:view_ledger',
      'treasury:transact',
      'team:view',
      'vault:upload',
      'blueprint:view',
      'blueprint:create',
      'blueprint:edit',
      'docs:edit',
    ],
  },

  Employee: {
    role: 'Employee',
    labelTr: 'Çalışan / Operatör',
    labelEn: 'Employee / Operator',
    badgeEmoji: '💼',
    clearance: 'LEVEL_2',
    shortDescTr: 'Standart şirket çalışanı. Kendisine atanan görevleri yürütür, operasyonel harcama girişi yapabilir; ancak kasa yönetimi ve üye onaylama yetkisi yoktur.',
    canSeeTr: [
      'Operasyonel harcama bakiyesi ve şirket genel bilançosu',
      'Kendisine ve ekibine atanan Kanban/Blueprint görevleri',
      'Şirket dokümantasyonu, wiki ve ekip fihristi',
      'Haberleşme kanalları ve mesajlar',
    ],
    canEditTr: [
      'Standart operasyonel harcama işlemi girme (küçük harcamalar)',
      'Kendisine ait görevleri güncelleme, not ekleme ve tamamlama',
      'Ortak doküman alanına içerik yazma',
    ],
    canExecuteTr: [
      'Görev tamamlama ve onay talebi gönderme',
    ],
    permissions: [
      'treasury:view_ledger',
      'treasury:transact',
      'team:view',
      'vault:upload',
      'blueprint:view',
      'blueprint:create',
      'blueprint:edit',
      'docs:edit',
    ],
  },

  Intern: {
    role: 'Intern',
    labelTr: 'Stajyer',
    labelEn: 'Intern / Trainee',
    badgeEmoji: '🎓',
    clearance: 'LEVEL_1',
    shortDescTr: 'Stajyer ve gözlemci seviyesi. Sistemde yalnızca temel oryantasyon ve salt-okunur haklara sahiptir. Finansal veriler maskelenir, hiçbir kalıcı veriyi değiştiremez veya silemez.',
    canSeeTr: [
      'Genel şirket dokümanları, eğitim materyalleri ve wiki',
      'Açık görev panosu (salt-okunur inceleme)',
      'Canlı piyasa kurları ve ticker bandı',
      '⚠️ KISITLAMA: Kasa rezervleri ve gizli sözleşmeler [STAJYER KISITLAMASI] ile maskelenir.',
    ],
    canEditTr: [
      '❌ Hazine ve kasada HİÇBİR işlem ekleyemez, fonlayamaz veya silemez',
      '❌ Ekip üyesi ekleyemez veya davetiye oluşturamaz',
      '❌ Görev silemez veya ana mimariyi değiştiremez',
      'Yalnızca inceleme amaçlı [TASLAK] görev önerisi bırakabilir',
    ],
    canExecuteTr: [
      'Yalnızca stajyer oryantasyonu ve eğitim içeriklerini tamamlama',
    ],
    permissions: [
      'blueprint:view',
    ],
  },

  Auditor: {
    role: 'Auditor',
    labelTr: 'Bağımsız Denetçi',
    labelEn: 'Independent Auditor',
    badgeEmoji: '🔍',
    clearance: 'LEVEL_2',
    shortDescTr: 'Dış veya iç denetçi profili. Tüm finansal kayıtları, hash zincirlerini ve denetim loglarını okuyabilir; ancak tarafsızlık gereği hiçbir şeyi değiştiremez.',
    canSeeTr: [
      'Tüm hazine defter kayıtları, zaman damgaları ve denetim blokları',
      'Kriptografik SHA-256 hash zinciri ve onay imzaları',
      'Ekip listesi ve yetki seviyeleri',
      'Kasa manifestosu kayıtları',
    ],
    canEditTr: [
      '❌ Değiştirme yetkisi yoktur (Salt-Okunur Denetim)',
      '❌ İşlem ekleyemez, fonlayamaz, sıfırlayamaz',
      '❌ Dosya yükleyemez veya silemez',
    ],
    canExecuteTr: [
      'Denetim raporu görüntüleme ve dışa aktarma',
    ],
    permissions: [
      'treasury:view_reserves',
      'treasury:view_ledger',
      'team:view',
      'vault:view_classified',
      'blueprint:view',
      'docs:view_classified',
    ],
  },
};
