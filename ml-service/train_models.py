#!/usr/bin/env python
"""
Script d'entraînement des modèles ML
Ce script est un wrapper pour lancer l'entraînement depuis la racine
"""

import sys
import os

# Ajoute le chemin courant au PYTHONPATH
sys.path.insert(0, os.path.dirname(__file__))

# Importe et exécute le script d'entraînement
from training.train import train_all_models

if __name__ == '__main__':
    print("🚀 Lancement de l'entraînement des modèles ML...")
    results = train_all_models()
    print("\n✅ Entraînement terminé !")
    print(f"Résultats: {results}")
