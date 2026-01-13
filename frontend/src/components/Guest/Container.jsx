function Container({ children }) {
  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-[1200px] px-4">
        {children}
      </div>
    </div>
  );
}

export default Container;
