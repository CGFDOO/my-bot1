// =========================================================================================================
// 🗄️ قاعدة البيانات الشاملة والمفصلة للمشروع (ULTIMATE ENTERPRISE GUILD CONFIGURATION SCHEMA)
// ---------------------------------------------------------------------------------------------------------
// هذا الملف يحتوي على جميع الإعدادات بدون أي اختصار.
// تم تعريف كل حقل بشكل صريح مع نوعه وقيمته الافتراضية لمنع أي أخطاء (Undefined Errors).
// =========================================================================================================

const mongoose = require('mongoose');

// -----------------------------------------------------------------------------------------
// تعريف هيكل البيانات (Schema)
// -----------------------------------------------------------------------------------------
const guildConfigSchema = new mongoose.Schema({
    
    // ==========================================
    // 🌐 1. الإعدادات الأساسية للسيرفر (Core Guild Settings)
    // ==========================================
    guildId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    prefix: { 
        type: String, 
        default: '!',
        required: false
    },

    // ==========================================
    // 🛡️ 2. نظام الوساطة الأساسي والمعزول (Isolated Middleman System)
    // ==========================================
    middlemanSystem: {
        enabled: { 
            type: Boolean, 
            default: false 
        },
        categoryId: { 
            type: String, 
            default: null 
        }, 
        panelChannelId: { 
            type: String, 
            default: null 
        }, 
        panelTitle: { 
            type: String, 
            default: 'تذكرة وساطة آمنة' 
        },
        panelDescription: { 
            type: String, 
            default: 'لطلب وسيط معتمد من الإدارة، يرجى فتح تذكرة من هنا.' 
        },
        panelColor: { 
            type: String, 
            default: '#f2a658' 
        },
        buttonLabel: { 
            type: String, 
            default: 'طلب وسيط 🛡️' 
        },
        modalTitle: { 
            type: String, 
            default: 'بيانات الوساطة (Trade Info)' 
        },
        // تفصيل حقول النافذة المنبثقة للوساطة
        modalFields: [{
            label: { 
                type: String, 
                required: true 
            },
            placeholder: { 
                type: String, 
                default: 'اكتب تفاصيلك هنا...' 
            },
            style: { 
                type: String, 
                default: 'Paragraph' 
            }, 
            required: { 
                type: Boolean, 
                default: true 
            }
        }],
        insideTicketTitle: { 
            type: String, 
            default: 'تذكرة الوساطة' 
        },
        insideTicketDescription: { 
            type: String, 
            default: 'يرجى انتظار الوسيط، وكتابة تفاصيل المعاملة بدقة.' 
        },
        insideTicketColor: { 
            type: String, 
            default: '#f2a658' 
        }
    },

    // ==========================================
    // 🎟️ 3. نظام التذاكر المتعددة والدعم الفني (Multi-Panel Ticket System)
    // ==========================================
    ticketPanels: [{
        panelId: { 
            type: String, 
            required: true 
        },
        channelId: { 
            type: String, 
            default: null 
        },
        categoryId: { 
            type: String, 
            default: null 
        },
        panelTitle: { 
            type: String, 
            default: 'الدعم الفني' 
        },
        panelDescription: { 
            type: String, 
            default: 'افتح تذكرة للتواصل مع الإدارة.' 
        },
        panelColor: { 
            type: String, 
            default: '#2b2d31' 
        },
        // الأزرار المخصصة داخل كل بانل
        buttons: [{
            id: { 
                type: String, 
                required: true 
            },
            label: { 
                type: String, 
                default: 'فتح تذكرة' 
            },
            color: { 
                type: String, 
                default: 'Secondary' 
            },
            emoji: { 
                type: String, 
                default: null 
            },
            enableStaffRating: { 
                type: Boolean, 
                default: true 
            },
            requireModal: { 
                type: Boolean, 
                default: false 
            },
            modalTitle: { 
                type: String, 
                default: 'بيانات التذكرة' 
            },
            modalFields: [{
                label: { 
                    type: String, 
                    required: true 
                },
                placeholder: { 
                    type: String, 
                    default: '' 
                },
                style: { 
                    type: String, 
                    default: 'Paragraph' 
                },
                required: { 
                    type: Boolean, 
                    default: true 
                }
            }],
            insideEmbedTitle: { 
                type: String, 
                default: 'تذكرة دعم فني' 
            },
            insideEmbedDesc: { 
                type: String, 
                default: 'فريق الدعم سيقوم بالرد عليك قريباً.' 
            },
            insideEmbedColor: { 
                type: String, 
                default: '#2b2d31' 
            }
        }]
    }],

    // ==========================================
    // ⭐ 4. نظام التقييمات والسجلات (Ratings & Feedback Logs)
    // ==========================================
    ratings: {
        middlemanLogChannelId: { 
            type: String, 
            default: null 
        },
        middlemanEmbedColor: { 
            type: String, 
            default: '#f2a658' 
        },
        staffLogChannelId: { 
            type: String, 
            default: null 
        },
        staffEmbedColor: { 
            type: String, 
            default: '#3ba55d' 
        },
        totalServerRatings: { 
            type: Number, 
            default: 0 
        },
        staffRatingsCount: { 
            type: Map, 
            of: Number, 
            default: {} 
        },
        middlemanRatingsCount: { 
            type: Map, 
            of: Number, 
            default: {} 
        }
    },

    // ==========================================
    // ⚙️ 5. إعدادات التحكم المتقدم للتذاكر (Advanced Ticket Controls)
    // ==========================================
    ticketControls: {
        maxOpenTicketsPerUser: { 
            type: Number, 
            default: 1 
        },
        controlPanelColor: { 
            type: String, 
            default: '#2b2d31' 
        }, 
        ticketLogChannelId: { 
            type: String, 
            default: null 
        },
        transcriptChannelId: { 
            type: String, 
            default: null 
        },
        transcriptEmbedColor: { 
            type: String, 
            default: '#2b2d31' 
        },
        hideTicketOnClaim: { 
            type: Boolean, 
            default: false 
        }, 
        readOnlyStaffOnClaim: { 
            type: Boolean, 
            default: false 
        } 
    },

    // ==========================================
    // 👮 6. نظام الرتب والصلاحيات المفصل (Hierarchy & Roles Configuration)
    // ==========================================
    roles: {
        adminRoleId: { 
            type: String, 
            default: null 
        }, 
        middlemanRoleId: { 
            type: String, 
            default: null 
        }, 
        highAdminRoles: { 
            type: [String], 
            default: [] 
        }, 
        highMiddlemanRoles: { 
            type: [String], 
            default: [] 
        },
        tradePingRoleIds: { 
            type: [String], 
            default: [] 
        }, 
        tradeApproveRoleIds: { 
            type: [String], 
            default: [] 
        } 
    },

    // ==========================================
    // 🛠️ 7. الأوامر الديناميكية والمخصصة (Dynamic & Custom Commands Router)
    // ==========================================
    commands: {
        
        // أوامر الإدارة الأساسية
        clearCmd: { 
            type: String, 
            default: 'clear' 
        },
        clearAllowedRoles: { 
            type: [String], 
            default: [] 
        },

        banCmd: { 
            type: String, 
            default: 'ban' 
        },
        banAllowedRoles: { 
            type: [String], 
            default: [] 
        },

        timeoutCmd: { 
            type: String, 
            default: 'timeout' 
        },
        timeoutAllowedRoles: { 
            type: [String], 
            default: [] 
        },

        comeCmd: { 
            type: String, 
            default: 'come' 
        },
        comeAllowedRoles: { 
            type: [String], 
            default: [] 
        },
        
        // أوامر الوساطة
        doneCmd: { 
            type: String, 
            default: '!done' 
        }, 
        doneAllowedRoles: { 
            type: [String], 
            default: [] 
        }, 
        
        tradeCmd: { 
            type: String, 
            default: '!trade' 
        },
        tradeAllowedRoles: { 
            type: [String], 
            default: [] 
        }, 
        tradeEmbedColor: { 
            type: String, 
            default: '#f2a658' 
        }
    },

    // ==========================================
    // 💬 8. الردود التلقائية (Auto Responders)
    // ==========================================
    autoResponders: [{
        triggerWord: { 
            type: String, 
            required: true 
        },
        replyMessage: { 
            type: String, 
            required: true 
        }
    }],

    // ==========================================
    // 📈 9. الإحصائيات العامة (Global Counters)
    // ==========================================
    ticketCount: { 
        type: Number, 
        default: 0 
    }
});

// تصدير الموديل للاستخدام في جميع أنحاء البوت
module.exports = mongoose.model('GuildConfig', guildConfigSchema);
