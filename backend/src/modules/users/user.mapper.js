export const userView = (user) =>
  user && {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    ...(user.created_at
      ? {
          created_at: user.created_at,
        }
      : {}),
  };
