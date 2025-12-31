import { Link } from "react-router-dom";
import { MapPin, Phone, Mail } from "lucide-react";
const Footer = () => {
  return <footer className="hidden md:block bg-gray-900 text-white">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h4 className="font-bold text-lg mb-4">SIVER</h4>
            <p className="text-gray-400 text-sm">
              Tu tienda de compras en línea confiable con los mejores productos
              a los mejores precios.
            </p>
          </div>

          {/* Compras */}
          <div>
            <h4 className="font-bold mb-4">COMPRAS</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link to="#" className="hover:text-white transition">
                  Solo para ti
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-white transition">
                  Novedades
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-white transition">
                  Ofertas
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-white transition">
                  Ropa de mujer
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-white transition">
                  Ropa de hombre
                </Link>
              </li>
            </ul>
          </div>

          {/* Categorías */}
          <div>
            <h4 className="font-bold mb-4">CATEGORÍAS</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link to="#" className="hover:text-white transition">
                  Accesorios
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-white transition">
                  Zapatos
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-white transition">
                  Belleza
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-white transition">
                  Hogar y Vida
                </Link>
              </li>
            </ul>
          </div>

          {/* Cuenta */}
          <div>
            <h4 className="font-bold mb-4">CUENTA</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link to="#" className="hover:text-white transition">
                  Mi Cuenta
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-white transition">
                  Mis Pedidos
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-white transition">
                  Favoritos
                </Link>
              </li>
              <li>
                
              </li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="font-bold mb-4">CONTACTO</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-gray-400">
                <Phone className="w-4 h-4" />
                +1 (509) 3234-5678
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <Mail className="w-4 h-4" />
                contacto@siver.com
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <MapPin className="w-4 h-4" />
                Puerto Príncipe, Haití
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400 mb-6">
            <div>
              <h5 className="font-semibold text-white mb-2">
                ✓ Envío desde el extranjero
              </h5>
              <p>Recibe tus productos en 7-15 días</p>
            </div>
            <div>
              <h5 className="font-semibold text-white mb-2">
                ✓ Devolución Gratis
              </h5>
              <p>Devuelve fácilmente en 30 días</p>
            </div>
            <div>
              <h5 className="font-semibold text-white mb-2">
                ✓ Pago Seguro
              </h5>
              <p>Múltiples opciones de pago</p>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="border-t border-gray-800 py-6">
          <p className="text-sm font-semibold text-white mb-4">Métodos de Pago Aceptados:</p>
          <div className="grid grid-cols-5 gap-4 md:gap-6 max-w-2xl">
            {/* Credit Cards */}
            <div className="flex flex-col items-center gap-2">
              <img src="/visa.png" alt="VISA" className="h-6 w-auto" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <img src="/mastercard.png" alt="Mastercard" className="h-6 w-auto" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <img src="/american express.png" alt="American Express" className="h-6 w-auto" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <img src="/apple pay.png" alt="Apple Pay" className="h-6 w-auto" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <img src="/google pay.png" alt="Google Pay" className="h-6 w-auto" />
            </div>

            {/* Bank Transfer */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded border border-gray-400">
                <span className="text-xs font-bold text-gray-400">BANCO</span>
              </div>
              <span className="text-xs text-gray-400">Transferencia</span>
            </div>

            {/* MonCash */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: '#94111f' }}>
                <span className="text-[9px] font-bold text-white">MC</span>
              </div>
              <span className="text-xs font-bold" style={{ color: '#94111f' }}>MonCash</span>
            </div>

            {/* NatCash */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: '#1e40af' }}>
                <span className="text-[9px] font-bold text-white">NC</span>
              </div>
              <span className="text-xs font-bold" style={{ color: '#1e40af' }}>NatCash</span>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
          <p>&copy; 2024 SIVER Market. Todos los derechos reservados.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link to="#" className="hover:text-white transition">
              Términos y Condiciones
            </Link>
            <Link to="#" className="hover:text-white transition">
              Política de Privacidad
            </Link>
            <Link to="#" className="hover:text-white transition">
              Política de Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>;
};
export default Footer;