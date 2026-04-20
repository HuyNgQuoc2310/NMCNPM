function handleDbError(res, error, messages = {}) {
  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      message: messages.duplicate || "Du lieu bi trung."
    });
  }

  if (error.code === "ER_NO_REFERENCED_ROW_2" || error.code === "ER_NO_REFERENCED_ROW") {
    return res.status(400).json({
      message: messages.foreignKey || "Du lieu lien ket khong hop le."
    });
  }

  if (error.code === "ER_ROW_IS_REFERENCED_2" || error.code === "ER_ROW_IS_REFERENCED") {
    return res.status(409).json({
      message: messages.referenced || "Ban ghi dang duoc su dung, khong the xoa."
    });
  }

  return res.status(500).json({
    message: messages.default || "Loi he thong.",
    error: error.message
  });
}

module.exports = handleDbError;
