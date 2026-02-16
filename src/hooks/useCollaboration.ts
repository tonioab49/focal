import { useEffect, useMemo, useRef, useState } from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";

const ADJECTIVES = ["Red", "Blue", "Green", "Purple", "Golden", "Silver", "Coral", "Amber", "Jade", "Ivory", "Crimson", "Azure", "Teal", "Violet"];
const ANIMALS = ["Fox", "Panda", "Owl", "Wolf", "Falcon", "Otter", "Lynx", "Heron", "Raven", "Tiger", "Bear", "Hawk", "Deer", "Crane"];
const COLORS = ["#e06c75", "#61afef", "#98c379", "#c678dd", "#e5c07b", "#56b6c2", "#be5046", "#d19a66", "#7ec8e3", "#c3a6ff"];

export interface CollaborationUser {
  id: string;
  name: string;
  color: string;
}

interface ConnectedUser {
  id: string;
  name: string;
  color: string;
  displayName: string;
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function getOrCreateUser(): CollaborationUser {
  if (typeof window === "undefined") {
    return { id: "server", name: "Anonymous", color: COLORS[0] };
  }
  const stored = sessionStorage.getItem("focal-collab-user");
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Partial<CollaborationUser>;
      if (typeof parsed.name === "string" && typeof parsed.color === "string") {
        const user: CollaborationUser = {
          id: typeof parsed.id === "string" ? parsed.id : randomId(),
          name: parsed.name,
          color: parsed.color,
        };
        sessionStorage.setItem("focal-collab-user", JSON.stringify(user));
        return user;
      }
    } catch {
      /* regenerate */
    }
  }
  const name = `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${ANIMALS[Math.floor(Math.random() * ANIMALS.length)]}`;
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const user: CollaborationUser = { id: randomId(), name, color };
  sessionStorage.setItem("focal-collab-user", JSON.stringify(user));
  return user;
}

interface UseCollaborationOptions {
  onSaveBroadcast?: () => void;
}

export function useCollaboration(roomName: string, options?: UseCollaborationOptions) {
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const user = useMemo(() => getOrCreateUser(), []);

  const wsUrl = useMemo(() => {
    if (typeof window === "undefined") {
      // This hook only runs on the client, so window should be defined.
      // Return a dummy value for SSR.
      return "";
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    return `${protocol}//${host}:1236`;
  }, []);

  // Provider + Y.Doc lifecycle
  useEffect(() => {
    if (!wsUrl) return; // Don't run on the server

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const p = new HocuspocusProvider({
      url: wsUrl,
      name: roomName,
      document: ydoc,
    });
    setProvider(p);

    return () => {
      p.destroy();
      ydoc.destroy();
      ydocRef.current = null;
      setProvider(null);
    };
  }, [roomName, wsUrl]);

  // Track connected users via awareness
  useEffect(() => {
    if (!provider) return;
    const awareness = provider.awareness;
    if (!awareness) return;

    awareness.setLocalStateField("user", user);

    const updateUsers = () => {
      const states = awareness.getStates();
      const users: ConnectedUser[] = [];
      states.forEach((state, clientId) => {
        const stateUser = state.user as Partial<CollaborationUser> | undefined;
        if (!stateUser) return;
        const isSelf = clientId === awareness.clientID || stateUser.id === user.id;
        const name = typeof stateUser.name === "string" ? stateUser.name : "Anonymous";
        const color = typeof stateUser.color === "string" ? stateUser.color : COLORS[0];
        const id = typeof stateUser.id === "string" ? stateUser.id : `client-${clientId}`;
        users.push({
          id,
          name,
          color,
          displayName: isSelf ? "Me" : name,
        });
      });
      setConnectedUsers(users);
    };

    awareness.on("change", updateUsers);
    updateUsers();

    return () => {
      awareness.off("change", updateUsers);
    };
  }, [provider, user]);

  // Listen for stateless save broadcasts
  const onSaveBroadcastRef = useRef(options?.onSaveBroadcast);
  onSaveBroadcastRef.current = options?.onSaveBroadcast;

  useEffect(() => {
    if (!provider) return;

    const handler = ({ payload }: { payload: string }) => {
      try {
        const msg = JSON.parse(payload);
        if (msg.type === "doc:saved") {
          onSaveBroadcastRef.current?.();
        }
      } catch {
        /* ignore malformed messages */
      }
    };

    provider.on("stateless", handler);
    return () => {
      provider.off("stateless", handler);
    };
  }, [provider]);

  const broadcastSave = useMemo(() => {
    return () => {
      provider?.sendStateless(JSON.stringify({ type: "doc:saved" }));
    };
  }, [provider]);

  return {
    provider,
    ydoc: ydocRef.current,
    ydocRef,
    connectedUsers,
    user,
    broadcastSave,
  };
}
