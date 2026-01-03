import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationItem from '../components/NotificationItem';
// 💥 CORRECTION : Utilise le nom de fichier correct 'notifications.css'
import '../styles/notifications.css';
// Assurez-vous que le fichier est bien à /frontend/src/styles/notifications.css
import { useNotifications } from "../context/NotificationContext";

export default function NotifsPage() {
    const nav = useNavigate();
    const token = localStorage.getItem("token");
    const { notifications = [], removeNotifications, loading } = useNotifications() || {};

    useEffect(() => {
        if (!token) {
            nav("/login");
            return;
        }
    }, [token, nav]);

    return (
        <div className="notifs-wrapper">
            <div className="notifs-header">
                <h2>Notifications</h2>
            </div>

            <div className="notifs-list">
                {notifications.length === 0 && !loading && (
                    <div className="notifs-empty">
                        Vous n'avez aucune notification.
                    </div>
                )}

                {notifications.map(notif => (
                    <NotificationItem
                        key={notif._id}
                        notif={notif}
                        onHandled={(id, extra) => {
                            if (extra?.handled) {
                                removeNotifications?.((n) => n._id === id);
                            }
                        }}
                    />
                ))}

                {loading && (
                    <div className="notifs-loading">Chargement...</div>
                )}
            </div>
        </div>
    );
}
