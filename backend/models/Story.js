const mongoose = require("mongoose");
const Schema = mongoose.Schema; // Importez Schema pour plus de clarté

// ===============================================
// 1. DÉFINITION DU SCHÉMA DE RÉACTION
// ===============================================
const ReactionSchema = new Schema({
    user: { 
        type: Schema.Types.ObjectId, // L'ID de l'utilisateur qui réagit
        ref: "User", 
        required: true 
    },
    type: { 
        type: String, 
        // Types de réactions que vous voulez supporter (ex: ❤️, 😂, 👍, 🔥)
        enum: ['❤️', '😂', '👍', '🔥', '😮', '😢'], 
        required: true 
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
}, { _id: false }); // Pas besoin d'un ID pour chaque réaction dans ce sous-document

// ===============================================
// 2. MODIFICATION DU SCHÉMA DE STORY
// ===============================================
const StorySchema = new mongoose.Schema({
  // Référence à l'utilisateur qui a créé la story
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  
  // URL de l'image ou de la vidéo
  media: { 
    type: String, 
    required: true 
  }, 
  
  // Type de média
  type: { 
    type: String, 
    enum: ["image", "video"], 
    default: "image" 
  },
  
  // 💥 NOUVEAU : Tableau des réactions à cette story
  reactions: [ReactionSchema], 
  
  // Date de création (pour le tri)
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  
  // Date d'expiration (24 heures après la création)
  expiresAt: { 
    type: Date, 
    default: () => Date.now() + 24 * 60 * 60 * 1000 
  }
});

// ===============================================
// AJOUT DE L'INDEX TTL (Time-To-Live) CRITIQUE
// ===============================================
// Cet index indique à MongoDB de supprimer automatiquement 
// le document lorsque la date dans 'expiresAt' est atteinte.
StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Story", StorySchema);